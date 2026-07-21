import { aiConfig } from "@aypros/config";
import {
  AiError,
  createGroqBusinessBriefingProvider,
  type BusinessBriefingInput,
  type BusinessBriefingOutput,
  type BusinessBriefingProvider,
  type BusinessSegment,
} from "@aypros/integrations";
import type {
  ApiErrorBody,
  BusinessBriefing,
  BusinessBriefingContent,
  BusinessBriefingResponse,
  GenerateBusinessBriefingResponse,
} from "@aypros/types";
import { businessBriefingOutputSchema } from "@aypros/integrations";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { z } from "zod";
import { toAiInput } from "./ai";
import { canAccessBusiness } from "./audits";
import { env } from "./env";
import { requireOrgContext } from "./org-context";
import { buildReportModel, buildReportResponse } from "./reports";
import { createServiceRoleClient } from "./supabase";
import { timed } from "./timing";

const businessIdParamSchema = z.object({ businessId: z.string().uuid() });
const BRIEFING_KIND = "commercial_briefing" as const;

type BusinessRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website_url: string | null;
  rating: number | string | null;
  review_count: number | null;
  categories: string[] | null;
  raw: Record<string, unknown> | null;
};

type AuditRow = {
  id: string;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  final_url: string | null;
  http_status: number | null;
  response_time_ms: number | null;
  redirect_count: number | null;
  is_https: boolean | null;
  detections: Record<string, { state?: string; evidence?: Record<string, unknown> }> | null;
  evidence?: Record<string, unknown> | null;
  error_code: string | null;
  created_at: string;
};

type ScoreRow = {
  score: number;
  level: string;
  confidence: string;
  reasons: Array<{ code: string; label: string; impact: number }>;
  suggested_services: string[];
  created_at?: string;
};

type LeadRow = {
  id: string;
  stage: string;
  status: string;
  assigned_to: string | null;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
};

type BriefingRow = {
  id: string;
  business_id: string;
  kind: string;
  content_json: unknown;
  summary: string;
  model: string;
  prompt_version: string;
  source_hash: string;
  created_at: string;
  updated_at: string;
};

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) return nested;
    return Object.fromEntries(Object.entries(nested).sort(([a], [b]) => a.localeCompare(b)));
  });
}

function sourceHash(input: BusinessBriefingInput): string {
  return createHash("sha256").update(stableJson(input)).digest("hex");
}

function toBriefing(row: BriefingRow, currentSourceHash: string): BusinessBriefing {
  const content = businessBriefingOutputSchema.parse(row.content_json) as BusinessBriefingContent;
  return {
    id: row.id,
    businessId: row.business_id,
    kind: BRIEFING_KIND,
    summary: row.summary,
    content,
    model: row.model,
    promptVersion: row.prompt_version,
    sourceHash: row.source_hash,
    isStale: row.source_hash !== currentSourceHash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function summaryFromOutput(output: BusinessBriefingOutput): string {
  return output.context.length <= 240 ? output.context : `${output.context.slice(0, 237).trimEnd()}...`;
}

async function latestBriefing(db: SupabaseClient, orgId: string, businessId: string) {
  const { data, error } = await db
    .from("business_ai_briefings")
    .select("id, business_id, kind, content_json, summary, model, prompt_version, source_hash, created_at, updated_at")
    .eq("organization_id", orgId)
    .eq("business_id", businessId)
    .eq("kind", BRIEFING_KIND)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`briefing lookup failed: ${error.message}`);
  return (data as BriefingRow | null) ?? null;
}

async function buildBriefingInput(params: {
  db: SupabaseClient;
  orgId: string;
  userId: string;
  businessId: string;
  organizationName?: string;
  senderName?: string | null;
}): Promise<BusinessBriefingInput | null> {
  const { db, orgId, userId, businessId } = params;
  const [businessResult, auditResult, scoreResult, profileResult, orgResult, leadResult] =
    await Promise.all([
      db
        .from("businesses")
        .select("id, name, address, city, state, phone, website_url, rating, review_count, categories, raw")
        .eq("id", businessId)
        .single(),
      db
        .from("website_audits")
        .select("id, status, final_url, http_status, response_time_ms, redirect_count, is_https, detections, evidence, error_code, created_at")
        .eq("organization_id", orgId)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("opportunity_scores")
        .select("score, level, confidence, reasons, suggested_services, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      params.senderName !== undefined
        ? null
        : db.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      params.organizationName ? null : db.from("organizations").select("name").eq("id", orgId).maybeSingle(),
      db
        .from("leads")
        .select("id, stage, status, assigned_to, last_contact_at, next_action, next_action_at")
        .eq("organization_id", orgId)
        .eq("business_id", businessId)
        .maybeSingle(),
    ]);

  if (businessResult.error || !businessResult.data) return null;

  const business = businessResult.data as BusinessRow;
  const audit = (auditResult.data as AuditRow | null) ?? null;
  const score = (scoreResult.data as ScoreRow | null) ?? null;
  const senderName =
    params.senderName ??
    ((profileResult as { data: { full_name: string | null } | null } | null)?.data?.full_name ?? null);
  const organizationName =
    params.organizationName ??
    ((orgResult as { data: { name: string } | null } | null)?.data?.name ?? null);
  const lead = (leadResult.data as LeadRow | null) ?? null;

  const reportModel = buildReportModel({
    business,
    audit: audit
      ? {
          ...audit,
          detections: audit.detections as Record<string, { state?: "detected" | "not_detected" | "inconclusive"; evidence?: Record<string, unknown> }> | null,
        }
      : null,
    score: score
      ? {
          score: score.score,
          level: score.level as "low" | "medium" | "high" | "very_high",
          confidence: score.confidence as "low" | "medium" | "high",
          reasons: score.reasons ?? [],
          suggested_services: score.suggested_services ?? [],
          created_at: score.created_at ?? new Date(0).toISOString(),
        }
      : null,
    organizationName: organizationName ?? "Aypros",
    senderName,
  });
  const report = buildReportResponse(reportModel);

  let assignedToName: string | null = null;
  let notes: string[] = [];
  if (lead) {
    const [assigneeResult, notesResult] = await Promise.all([
      lead.assigned_to ? db.from("profiles").select("full_name").eq("id", lead.assigned_to).maybeSingle() : null,
      db
        .from("notes")
        .select("content")
        .eq("organization_id", orgId)
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
    assignedToName = (assigneeResult?.data as { full_name: string | null } | null)?.full_name ?? null;
    notes = ((notesResult.data ?? []) as Array<{ content: string }>).map((note) => note.content);
  }

  const baseInput = toAiInput({
    business: {
      id: business.id,
      name: business.name,
      city: business.city,
      state: business.state,
      categories: business.categories,
      rating: business.rating,
      review_count: business.review_count,
      website_url: business.website_url,
      phone: business.phone,
      raw: business.raw,
    },
    audit: audit
      ? {
          status: audit.status,
          is_https: audit.is_https,
          response_time_ms: audit.response_time_ms,
          detections: audit.detections,
        }
      : null,
    score: score
      ? {
          score: score.score,
          level: score.level,
          confidence: score.confidence,
          reasons: score.reasons ?? [],
          suggested_services: score.suggested_services ?? [],
        }
      : null,
    senderName,
    organizationName,
  });

  return {
    ...baseInput,
    business: {
      ...baseInput.business,
      segment: baseInput.business.segment as BusinessSegment,
    },
    report: {
      summary: report.summary,
      findings: report.findings,
      recommendations: report.recommendations,
      nextSteps: report.nextSteps,
      httpStatusNote: report.httpStatusNote,
    },
    pipeline: lead
      ? {
          leadId: lead.id,
          stage: lead.stage,
          status: lead.status,
          assignedToName,
          lastContactAt: lead.last_contact_at,
          nextAction: lead.next_action,
          nextActionAt: lead.next_action_at,
          notes,
        }
      : null,
  };
}

function friendlyAiError(error: AiError): { status: number; body: ApiErrorBody } {
  switch (error.code) {
    case "TIMEOUT":
      return { status: 504, body: { error: "A geração demorou demais. Tente novamente." } };
    case "RATE_LIMITED":
      return { status: 503, body: { error: "O provedor de IA está sobrecarregado. Tente em instantes." } };
    case "INVALID_OUTPUT":
      return { status: 502, body: { error: "A IA não retornou um briefing válido. Tente gerar novamente." } };
    default:
      return { status: 502, body: { error: "Erro no provedor de IA. Tente novamente." } };
  }
}

export type BusinessBriefingRoutesOptions = {
  serviceDb?: SupabaseClient;
  briefingProvider?: BusinessBriefingProvider | null;
};

export function registerBusinessBriefingRoutes(
  app: FastifyInstance,
  options: BusinessBriefingRoutesOptions = {},
) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();
  const provider =
    options.briefingProvider !== undefined
      ? options.briefingProvider
      : env.GROQ_API_KEY
        ? createGroqBusinessBriefingProvider({
            apiKey: env.GROQ_API_KEY,
            model: aiConfig.model,
            fallbackModel: aiConfig.fallbackModel,
            timeoutMs: aiConfig.timeoutMs,
            maxTokens: aiConfig.maxBusinessBriefingTokens,
          })
        : null;

  app.get("/v1/businesses/:businessId/briefing", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      if (!(await timed(request, "business.access", () => canAccessBusiness(serviceDb, ctx.orgId, params.data.businessId)))) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }
      const row = await timed(request, "briefing.latest", () =>
        latestBriefing(serviceDb, ctx.orgId, params.data.businessId),
      );
      if (!row) {
        return reply.send({
          briefing: null,
          sourceHash: "",
        } satisfies BusinessBriefingResponse);
      }
      const input = await timed(request, "briefing.input", () =>
        buildBriefingInput({
          db: serviceDb,
          orgId: ctx.orgId,
          userId: ctx.userId,
          businessId: params.data.businessId,
          organizationName: ctx.organizationName,
          senderName: ctx.userName,
        }),
      );
      if (!input) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }
      const hash = sourceHash(input);
      return reply.send({
        briefing: toBriefing(row, hash),
        sourceHash: hash,
      } satisfies BusinessBriefingResponse);
    } catch (error) {
      request.log.error({ err: error }, "business briefing lookup failed");
      return reply.code(500).send({ error: "Erro ao carregar briefing" } satisfies ApiErrorBody);
    }
  });

  app.post("/v1/businesses/:businessId/briefing", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    if (!provider) {
      return reply.code(503).send({
        error: "Briefing com IA não está configurado neste ambiente",
        code: "AI_NOT_CONFIGURED",
      } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      if (!(await timed(request, "business.access", () => canAccessBusiness(serviceDb, ctx.orgId, params.data.businessId)))) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }
      const input = await timed(request, "briefing.input", () =>
        buildBriefingInput({
          db: serviceDb,
          orgId: ctx.orgId,
          userId: ctx.userId,
          businessId: params.data.businessId,
          organizationName: ctx.organizationName,
          senderName: ctx.userName,
        }),
      );
      if (!input) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }
      const hash = sourceHash(input);
      const result = await timed(request, "briefing.provider", () => provider.generate(input));
      const { data, error } = await timed(request, "briefing.insert", () =>
        serviceDb
          .from("business_ai_briefings")
          .insert({
            organization_id: ctx.orgId,
            business_id: params.data.businessId,
            kind: BRIEFING_KIND,
            content_json: result.output,
            summary: summaryFromOutput(result.output),
            model: result.model,
            prompt_version: result.promptVersion,
            source_hash: hash,
            created_by: ctx.userId,
          })
          .select("id, business_id, kind, content_json, summary, model, prompt_version, source_hash, created_at, updated_at")
          .single(),
      );

      if (error || !data) {
        throw new Error(`briefing insert failed: ${error?.message ?? "missing data"}`);
      }

      await serviceDb.from("activities").insert({
        organization_id: ctx.orgId,
        business_id: params.data.businessId,
        actor_id: ctx.userId,
        type: "ai_generated",
        payload: { kind: BRIEFING_KIND, briefing_id: (data as BriefingRow).id },
      });

      return reply.code(201).send({
        briefing: toBriefing(data as BriefingRow, hash),
      } satisfies GenerateBusinessBriefingResponse);
    } catch (error) {
      if (error instanceof AiError) {
        const mapped = friendlyAiError(error);
        return reply.code(mapped.status).send(mapped.body);
      }
      request.log.error({ err: error }, "business briefing generation failed");
      return reply.code(500).send({ error: "Erro ao gerar briefing" } satisfies ApiErrorBody);
    }
  });
}
