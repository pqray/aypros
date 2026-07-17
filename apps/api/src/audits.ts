import { auditConfig } from "@aypros/config";
import {
  auditWebsite,
  AuditError,
  mapCategoriesToSegment,
  type AuditDetections,
  type AuditResult,
  type BusinessSegment,
} from "@aypros/integrations";
import {
  calculateOpportunityScore,
  type ScoreAuditInput,
  type ScoreBusinessInput,
} from "@aypros/scoring";
import type { ApiErrorBody, BusinessAuditSummaryResponse } from "@aypros/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrgContext } from "./org-context";
import { createServiceRoleClient } from "./supabase";

const businessIdParamSchema = z.object({ businessId: z.string().uuid() });

type BusinessAuditRow = {
  id: string;
  name: string;
  website_url: string | null;
  phone: string | null;
  rating: number | string | null;
  review_count: number | null;
  categories?: string[] | null;
  refreshed_at?: string | null;
  provider_status?: "active" | "removed" | "error" | null;
  raw: Record<string, unknown> | null;
};

type AuditSummaryRow = {
  id: string;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  final_url: string | null;
  http_status: number | null;
  response_time_ms: number | null;
  redirect_count: number | null;
  is_https: boolean | null;
  detections: Record<
    string,
    { state?: "detected" | "not_detected" | "inconclusive"; evidence?: Record<string, unknown> }
  >;
  evidence: Record<string, unknown>;
  error_code: string | null;
  created_at: string;
  completed_at: string | null;
};

type ScoreSummaryRow = {
  id: string;
  audit_id: string | null;
  score: number;
  level: "low" | "medium" | "high" | "very_high";
  confidence: "low" | "medium" | "high";
  reasons: Array<{ code: string; label: string; impact: number }>;
  suggested_services: string[];
  algorithm_version: string;
  created_at: string;
};

type AuditSummaryRpcRow = {
  business_id: string;
  business_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website_url: string | null;
  rating: number | string | null;
  review_count: number | null;
  categories: string[];
  refreshed_at: string | null;
  provider_status: "active" | "removed" | "error" | null;
  raw: Record<string, unknown> | null;
  audit_id: string | null;
  audit_status: AuditSummaryRow["status"] | null;
  final_url: string | null;
  http_status: number | null;
  response_time_ms: number | null;
  redirect_count: number | null;
  is_https: boolean | null;
  detections: AuditSummaryRow["detections"] | null;
  evidence: AuditSummaryRow["evidence"] | null;
  error_code: string | null;
  audit_created_at: string | null;
  audit_completed_at: string | null;
  score_id: string | null;
  score_audit_id: string | null;
  score: number | null;
  score_level: ScoreSummaryRow["level"] | null;
  score_confidence: ScoreSummaryRow["confidence"] | null;
  reasons: ScoreSummaryRow["reasons"] | null;
  suggested_services: string[] | null;
  algorithm_version: string | null;
  score_created_at: string | null;
  favorited: boolean;
  lead_id: string | null;
};

function toBusinessInput(row: BusinessAuditRow): ScoreBusinessInput {
  return {
    websiteUrl: row.website_url,
    phone: row.phone,
    rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
    reviewCount: row.review_count,
    raw: {
      socialOnly: row.raw?.social_only === true || row.raw?.socialOnly === true,
      segment:
        ((row.raw?.segment ?? row.raw?.business_segment) as BusinessSegment | undefined) ??
        mapCategoriesToSegment(row.categories ?? []),
    },
  };
}

function toBusinessDetail(row: BusinessAuditRow): BusinessAuditSummaryResponse["business"] {
  return {
    id: row.id,
    name: row.name,
    address: (row as BusinessAuditRow & { address?: string | null }).address ?? null,
    city: (row as BusinessAuditRow & { city?: string | null }).city ?? null,
    state: (row as BusinessAuditRow & { state?: string | null }).state ?? null,
    phone: row.phone,
    websiteUrl: row.website_url,
    rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
    reviewCount: row.review_count,
    categories: (row as BusinessAuditRow & { categories?: string[] }).categories ?? [],
    segment:
      ((row.raw?.segment ?? row.raw?.business_segment) as BusinessSegment | undefined) ??
      mapCategoriesToSegment((row as BusinessAuditRow & { categories?: string[] }).categories ?? []),
  };
}

function detectionState(detections: AuditDetections, key: keyof AuditDetections) {
  return detections[key]?.state ?? "inconclusive";
}

function toScoreAuditInput(audit: AuditResult | null): ScoreAuditInput {
  if (!audit) return null;
  return {
    status: audit.status,
    errorCode: audit.errorCode,
    isHttps: audit.isHttps,
    detections: {
      siteDown: detectionState(audit.detections, "siteDown"),
      sslError: detectionState(audit.detections, "sslError"),
      hasViewport: detectionState(audit.detections, "hasViewport"),
      hasTitle: detectionState(audit.detections, "hasTitle"),
      hasDescription: detectionState(audit.detections, "hasDescription"),
      outdated: detectionState(audit.detections, "outdated"),
      basicBuilder: detectionState(audit.detections, "basicBuilder"),
      linkInBio: detectionState(audit.detections, "linkInBio"),
      deliveryPlatform: detectionState(audit.detections, "deliveryPlatform"),
      menuOnline: detectionState(audit.detections, "menuOnline"),
    },
  };
}

async function persistBusinessSegment(db: SupabaseClient, business: BusinessAuditRow) {
  const segment = mapCategoriesToSegment(business.categories ?? []);
  const raw = { ...(business.raw ?? {}), segment };
  business.raw = raw;
  const { error } = await db.from("businesses").update({ raw }).eq("id", business.id);
  if (error) {
    throw new Error(`business segment update failed: ${error.message}`);
  }
}

async function ensureAuditRateLimit(db: SupabaseClient, orgId: string) {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("website_audits")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", windowStart);

  if (error) {
    throw new Error(`audit rate limit check failed: ${error.message}`);
  }
  if ((count ?? 0) >= auditConfig.maxAuditsPerOrgPerHour) {
    const rateError = new Error("AUDIT_RATE_LIMITED");
    rateError.name = "RateLimitError";
    throw rateError;
  }
}

async function insertScore(params: {
  db: SupabaseClient;
  business: BusinessAuditRow;
  auditId: string | null;
  audit: AuditResult | null;
}) {
  const score = calculateOpportunityScore(
    toBusinessInput(params.business),
    toScoreAuditInput(params.audit),
  );
  const { data, error } = await params.db
    .from("opportunity_scores")
    .insert({
      business_id: params.business.id,
      audit_id: params.auditId,
      score: score.score,
      level: score.level,
      confidence: score.confidence,
      reasons: score.reasons,
      suggested_services: score.suggestedServices,
      algorithm_version: score.algorithmVersion,
    })
    .select(
      "id, score, level, confidence, reasons, suggested_services, algorithm_version, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error(`score insert failed: ${error?.message ?? "missing data"}`);
  }

  return data;
}

async function persistAudit(params: {
  db: SupabaseClient;
  orgId: string;
  userId: string;
  business: BusinessAuditRow;
  audit: AuditResult;
}) {
  const { data, error } = await params.db
    .from("website_audits")
    .insert({
      business_id: params.business.id,
      organization_id: params.orgId,
      requested_by: params.userId,
      status: params.audit.status,
      final_url: params.audit.finalUrl,
      http_status: params.audit.httpStatus,
      response_time_ms: params.audit.responseTimeMs,
      redirect_count: params.audit.redirectCount,
      is_https: params.audit.isHttps,
      detections: params.audit.detections,
      evidence: params.audit.evidence,
      error_code: params.audit.errorCode,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`audit insert failed: ${error?.message ?? "missing data"}`);
  }

  return data.id as string;
}

function failedAudit(error: unknown): AuditResult {
  const code = error instanceof AuditError ? error.code : "FETCH_FAILED";
  return {
    status: "failed",
    finalUrl: null,
    httpStatus: null,
    responseTimeMs: null,
    redirectCount: 0,
    isHttps: null,
    htmlSizeBytes: 0,
    detections: {} as AuditDetections,
    evidence: { error: error instanceof Error ? error.message : String(error) },
    errorCode: code,
  };
}

export async function canAccessBusiness(db: SupabaseClient, orgId: string, businessId: string) {
  const { data, error } = await db
    .from("search_results")
    .select("business_id, search:searches!inner(id)")
    .eq("business_id", businessId)
    .eq("search.organization_id", orgId)
    .limit(1);

  if (error) {
    throw new Error(`business access check failed: ${error.message}`);
  }
  return (data ?? []).length > 0;
}

export async function auditBusiness(params: {
  db: SupabaseClient;
  orgId: string;
  userId: string;
  businessId: string;
  enforceRateLimit?: boolean;
}) {
  if (params.enforceRateLimit ?? true) {
    await ensureAuditRateLimit(params.db, params.orgId);
  }

  const { data: business, error: businessError } = await params.db
    .from("businesses")
    .select("id, name, website_url, phone, rating, review_count, categories, raw")
    .eq("id", params.businessId)
    .maybeSingle();

  if (businessError) {
    throw new Error(`business fetch failed: ${businessError.message}`);
  }
  if (!business) {
    return null;
  }

  const businessRow = business as BusinessAuditRow;
  await persistBusinessSegment(params.db, businessRow);
  let audit: AuditResult | null = null;
  let auditId: string | null = null;

  if (businessRow.website_url?.trim()) {
    try {
      audit = await auditWebsite({ url: businessRow.website_url });
    } catch (error) {
      audit = failedAudit(error);
    }
    auditId = await persistAudit({
      db: params.db,
      orgId: params.orgId,
      userId: params.userId,
      business: businessRow,
      audit,
    });
  }

  const score = await insertScore({ db: params.db, business: businessRow, auditId, audit });

  await params.db.from("activities").insert({
    organization_id: params.orgId,
    business_id: businessRow.id,
    actor_id: params.userId,
    type: "audit_completed",
    payload: {
      audit_id: auditId,
      score_id: (score as { id: string }).id,
      score: (score as { score: number }).score,
    },
  });

  return { auditId, score };
}

export async function auditSearchResults(params: {
  db: SupabaseClient;
  orgId: string;
  userId: string;
  searchId: string;
}) {
  const { data } = await params.db
    .from("search_results")
    .select("business_id")
    .eq("search_id", params.searchId)
    .order("position", { ascending: true })
    .limit(auditConfig.maxBatchAuditsPerSearch);

  for (const row of (data ?? []) as Array<{ business_id: string }>) {
    await auditBusiness({
      db: params.db,
      orgId: params.orgId,
      userId: params.userId,
      businessId: row.business_id,
      enforceRateLimit: false,
    });
  }
}

export type AuditRoutesOptions = {
  serviceDb?: SupabaseClient;
};

export function registerAuditRoutes(app: FastifyInstance, options: AuditRoutesOptions = {}) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();

  app.get("/v1/businesses/:businessId/audit-summary", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      const { data, error } = await serviceDb
        .rpc("get_business_audit_summary", {
          target_business_id: params.data.businessId,
          org_id: ctx.orgId,
        })
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }

      const row = data as AuditSummaryRpcRow;
      return reply.send({
        business: toBusinessDetail({
          id: row.business_id,
          name: row.business_name,
          address: row.address,
          city: row.city,
          state: row.state,
          phone: row.phone,
          website_url: row.website_url,
          rating: row.rating,
          review_count: row.review_count,
          categories: row.categories,
          raw: row.raw,
        } as BusinessAuditRow),
        latestAudit: row.audit_id
          ? {
              id: row.audit_id,
              status: row.audit_status ?? "completed",
              finalUrl: row.final_url,
              httpStatus: row.http_status,
              responseTimeMs: row.response_time_ms,
              redirectCount: row.redirect_count,
              isHttps: row.is_https,
              detections: row.detections ?? {},
              evidence: row.evidence ?? {},
              errorCode: row.error_code,
              createdAt: row.audit_created_at ?? new Date(0).toISOString(),
              completedAt: row.audit_completed_at,
            }
          : null,
        latestScore: row.score_id
          ? {
              id: row.score_id,
              auditId: row.score_audit_id,
              score: row.score ?? 0,
              level: row.score_level ?? "low",
              confidence: row.score_confidence ?? "low",
              reasons: row.reasons ?? [],
              suggestedServices: row.suggested_services ?? [],
              algorithmVersion: row.algorithm_version ?? "unknown",
              createdAt: row.score_created_at ?? new Date(0).toISOString(),
            }
          : null,
        refreshedAt: row.refreshed_at,
        providerStatus: row.provider_status ?? "active",
        favorited: row.favorited,
        leadId: row.lead_id,
      } satisfies BusinessAuditSummaryResponse);
    } catch (error) {
      request.log.error({ err: error }, "business audit summary failed");
      return reply.code(500).send({ error: "Erro ao carregar auditoria" } satisfies ApiErrorBody);
    }
  });

  app.post("/v1/businesses/:businessId/audit", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      const result = await auditBusiness({
        db: serviceDb,
        orgId: ctx.orgId,
        userId: ctx.userId,
        businessId: params.data.businessId,
      });

      if (!result) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }

      return reply.code(202).send(result);
    } catch (error) {
      if (error instanceof Error && error.name === "RateLimitError") {
        return reply.code(429).send({
          error: "Limite de auditorias por hora atingido",
          code: "RATE_LIMITED",
        } satisfies ApiErrorBody);
      }
      request.log.error({ err: error }, "business audit failed");
      return reply.code(500).send({ error: "Erro ao auditar site" } satisfies ApiErrorBody);
    }
  });
}
