import { auditConfig } from "@aypros/config";
import {
  auditWebsite,
  AuditError,
  type AuditDetections,
  type AuditResult,
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

function toBusinessInput(row: BusinessAuditRow): ScoreBusinessInput {
  return {
    websiteUrl: row.website_url,
    phone: row.phone,
    rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
    reviewCount: row.review_count,
    raw: {
      socialOnly: row.raw?.social_only === true || row.raw?.socialOnly === true,
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
    },
  };
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

async function canAccessBusiness(db: SupabaseClient, orgId: string, businessId: string) {
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
    .select("id, name, website_url, phone, rating, review_count, raw")
    .eq("id", params.businessId)
    .maybeSingle();

  if (businessError) {
    throw new Error(`business fetch failed: ${businessError.message}`);
  }
  if (!business) {
    return null;
  }

  const businessRow = business as BusinessAuditRow;
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
      return reply.code(400).send({ error: "Id invalido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      if (!(await canAccessBusiness(serviceDb, ctx.orgId, params.data.businessId))) {
        return reply.code(404).send({ error: "Empresa nao encontrada" } satisfies ApiErrorBody);
      }

      const [businessResult, auditResult, scoreResult, favoriteResult, leadResult] = await Promise.all([
        serviceDb
          .from("businesses")
          .select(
            "id, name, address, city, state, phone, website_url, rating, review_count, categories, raw",
          )
          .eq("id", params.data.businessId)
          .single(),
        serviceDb
          .from("website_audits")
          .select(
            "id, status, final_url, http_status, response_time_ms, redirect_count, is_https, detections, evidence, error_code, created_at, completed_at",
          )
          .eq("organization_id", ctx.orgId)
          .eq("business_id", params.data.businessId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        serviceDb
          .from("opportunity_scores")
          .select(
            "id, audit_id, score, level, confidence, reasons, suggested_services, algorithm_version, created_at",
          )
          .eq("business_id", params.data.businessId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        serviceDb
          .from("favorites")
          .select("business_id")
          .eq("organization_id", ctx.orgId)
          .eq("business_id", params.data.businessId)
          .maybeSingle(),
        serviceDb
          .from("leads")
          .select("id")
          .eq("organization_id", ctx.orgId)
          .eq("business_id", params.data.businessId)
          .maybeSingle(),
      ]);

      if (businessResult.error || !businessResult.data) {
        return reply.code(404).send({ error: "Empresa nao encontrada" } satisfies ApiErrorBody);
      }
      if (auditResult.error || scoreResult.error) {
        throw new Error(
          auditResult.error?.message ?? scoreResult.error?.message ?? "summary failed",
        );
      }

      const audit = auditResult.data as AuditSummaryRow | null;
      const score = scoreResult.data as ScoreSummaryRow | null;
      return reply.send({
        business: toBusinessDetail(businessResult.data as BusinessAuditRow),
        latestAudit: audit
          ? {
              id: audit.id,
              status: audit.status,
              finalUrl: audit.final_url,
              httpStatus: audit.http_status,
              responseTimeMs: audit.response_time_ms,
              redirectCount: audit.redirect_count,
              isHttps: audit.is_https,
              detections: audit.detections,
              evidence: audit.evidence,
              errorCode: audit.error_code,
              createdAt: audit.created_at,
              completedAt: audit.completed_at,
            }
          : null,
        latestScore: score
          ? {
              id: score.id,
              auditId: score.audit_id,
              score: score.score,
              level: score.level,
              confidence: score.confidence,
              reasons: score.reasons,
              suggestedServices: score.suggested_services,
              algorithmVersion: score.algorithm_version,
              createdAt: score.created_at,
            }
          : null,
        favorited: favoriteResult.data !== null,
        leadId: (leadResult.data as { id: string } | null)?.id ?? null,
      } satisfies BusinessAuditSummaryResponse);
    } catch (error) {
      request.log.error({ err: error }, "business audit summary failed");
      return reply.code(500).send({ error: "Erro ao carregar auditoria" } satisfies ApiErrorBody);
    }
  });

  app.post("/v1/businesses/:businessId/audit", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id invalido" } satisfies ApiErrorBody);
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
        return reply.code(404).send({ error: "Empresa nao encontrada" } satisfies ApiErrorBody);
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
