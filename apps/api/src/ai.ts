import { aiConfig } from "@aypros/config";
import {
  AiError,
  createGroqAiProvider,
  mapCategoriesToSegment,
  type AiDetectionState,
  type AiInput,
  type AiProvider,
  type BusinessSegment,
} from "@aypros/integrations";
import type {
  AiGenerationsResponse,
  AiGenerationSummary,
  ApiErrorBody,
  GenerateAiResponse,
} from "@aypros/types";
import { generateAiSchema } from "@aypros/validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { canAccessBusiness } from "./audits";
import { env } from "./env";
import { requireOrgContext } from "./org-context";
import { createServiceRoleClient } from "./supabase";

const businessIdParamSchema = z.object({ businessId: z.string().uuid() });

type BusinessRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  categories: string[] | null;
  rating: number | string | null;
  review_count: number | null;
  website_url: string | null;
  phone: string | null;
  raw?: Record<string, unknown> | null;
};

type AuditRow = {
  status: string;
  is_https: boolean | null;
  response_time_ms: number | null;
  detections: Record<string, { state?: string; evidence?: Record<string, unknown> }> | null;
};

type ScoreRow = {
  score: number;
  level: string;
  confidence: string;
  reasons: Array<{ code: string; label: string; impact: number }>;
  suggested_services: string[];
};

type GenerationRow = {
  id: string;
  kind: AiGenerationSummary["kind"];
  status: AiGenerationSummary["status"];
  output: AiGenerationSummary["output"];
  model: string;
  tokens_used: number | null;
  prompt_version: string;
  created_at: string;
};

const VALID_STATES = new Set(["detected", "not_detected", "inconclusive"]);
const PLATFORM_CODES = new Set(["instagram", "socialLinks", "linkInBio", "deliveryPlatform", "menuOnline"]);

function toDetectionState(value: string | undefined): AiDetectionState {
  return (VALID_STATES.has(value ?? "") ? value : "inconclusive") as AiDetectionState;
}

/** Pure assembly of the structured prompt input from DB rows (specs/13). */
export function toAiInput(params: {
  business: BusinessRow;
  audit: AuditRow | null;
  score: ScoreRow | null;
  senderName: string | null;
  organizationName: string | null;
}): AiInput {
  const { business, audit, score } = params;
  return {
    business: {
      name: business.name,
      city: business.city,
      state: business.state,
      categories: business.categories ?? [],
      rating:
        business.rating === null || business.rating === undefined ? null : Number(business.rating),
      reviewCount: business.review_count,
      hasWebsite: Boolean(business.website_url?.trim()),
      websiteUrl: business.website_url,
      phone: business.phone,
      socialOnly: business.raw?.socialOnly === true || business.raw?.social_only === true,
      socialPlatform:
        ((business.raw?.socialPlatform ?? business.raw?.social_platform) as string | null | undefined) ??
        null,
      segment:
        ((business.raw?.segment ?? business.raw?.business_segment) as BusinessSegment | undefined) ??
        mapCategoriesToSegment(business.categories ?? []),
    },
    audit: audit
      ? {
          status: audit.status,
          isHttps: audit.is_https,
          responseTimeMs: audit.response_time_ms,
          findings: Object.entries(audit.detections ?? {}).map(([code, value]) => ({
            code,
            state: toDetectionState(value?.state),
          })),
          platforms: Object.entries(audit.detections ?? {})
            .filter(([code]) => PLATFORM_CODES.has(code))
            .map(([code, value]) => ({
              code,
              state: toDetectionState(value?.state),
              evidence: value?.evidence,
            })),
        }
      : null,
    score: score
      ? {
          score: score.score,
          level: score.level,
          confidence: score.confidence,
          reasons: score.reasons ?? [],
          suggestedServices: score.suggested_services ?? [],
        }
      : null,
    sender: {
      name: params.senderName,
      organization: params.organizationName,
    },
  };
}

function toGenerationSummary(row: GenerationRow): AiGenerationSummary {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    output: row.output,
    model: row.model,
    tokensUsed: row.tokens_used,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
  };
}

async function ensureAiRateLimit(db: SupabaseClient, orgId: string) {
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", windowStart);

  if (error) {
    throw new Error(`ai rate limit check failed: ${error.message}`);
  }
  if ((count ?? 0) >= aiConfig.maxGenerationsPerOrgPerDay) {
    const rateError = new Error("AI_RATE_LIMITED");
    rateError.name = "RateLimitError";
    throw rateError;
  }
}

function friendlyAiError(error: AiError): { status: number; body: ApiErrorBody } {
  switch (error.code) {
    case "TIMEOUT":
      return { status: 504, body: { error: "A geração demorou demais. Tente novamente." } };
    case "RATE_LIMITED":
      return {
        status: 503,
        body: { error: "O provedor de IA está sobrecarregado. Tente em instantes." },
      };
    case "INVALID_OUTPUT":
      return {
        status: 502,
        body: { error: "A IA não retornou um resultado válido. Tente gerar novamente." },
      };
    default:
      return { status: 502, body: { error: "Erro no provedor de IA. Tente novamente." } };
  }
}

export type AiRoutesOptions = {
  serviceDb?: SupabaseClient;
  aiProvider?: AiProvider | null;
};

export function registerAiRoutes(app: FastifyInstance, options: AiRoutesOptions = {}) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();
  const provider =
    options.aiProvider !== undefined
      ? options.aiProvider
      : env.GROQ_API_KEY
        ? createGroqAiProvider({
            apiKey: env.GROQ_API_KEY,
            model: aiConfig.model,
            fallbackModel: aiConfig.fallbackModel,
            timeoutMs: aiConfig.timeoutMs,
            maxTokensByKind: aiConfig.maxTokensByKind,
          })
        : null;

  app.get("/v1/businesses/:businessId/ai-generations", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      const { data, error } = await serviceDb.rpc("get_business_ai_generations_api", {
        target_business_id: params.data.businessId,
        org_id: ctx.orgId,
        result_limit: 12,
      });

      if (error) throw new Error(error.message);

      return reply.send({
        items: ((data ?? []) as GenerationRow[]).map(toGenerationSummary),
      } satisfies AiGenerationsResponse);
    } catch (error) {
      request.log.error({ err: error }, "ai generations list failed");
      return reply.code(500).send({ error: "Erro ao carregar gerações" } satisfies ApiErrorBody);
    }
  });

  app.post("/v1/businesses/:businessId/ai-generations", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = generateAiSchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Tipo de geração inválido" } satisfies ApiErrorBody);
    }

    if (!provider) {
      return reply.code(503).send({
        error: "Geração com IA não está configurada neste ambiente",
        code: "AI_NOT_CONFIGURED",
      } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      if (!(await canAccessBusiness(serviceDb, ctx.orgId, params.data.businessId))) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }
      await ensureAiRateLimit(serviceDb, ctx.orgId);

      const [businessResult, auditResult, scoreResult, profileResult, orgResult] =
        await Promise.all([
          serviceDb
            .from("businesses")
            .select("id, name, city, state, categories, rating, review_count, website_url, phone, raw")
            .eq("id", params.data.businessId)
            .single(),
          serviceDb
            .from("website_audits")
            .select("status, is_https, response_time_ms, detections")
            .eq("organization_id", ctx.orgId)
            .eq("business_id", params.data.businessId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          serviceDb
            .from("opportunity_scores")
            .select("score, level, confidence, reasons, suggested_services")
            .eq("business_id", params.data.businessId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          serviceDb.from("profiles").select("full_name").eq("id", ctx.userId).maybeSingle(),
          serviceDb.from("organizations").select("name").eq("id", ctx.orgId).maybeSingle(),
        ]);

      if (businessResult.error || !businessResult.data) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }

      const input = toAiInput({
        business: businessResult.data as BusinessRow,
        audit: (auditResult.data as AuditRow | null) ?? null,
        score: (scoreResult.data as ScoreRow | null) ?? null,
        senderName: (profileResult.data as { full_name: string | null } | null)?.full_name ?? null,
        organizationName: (orgResult.data as { name: string } | null)?.name ?? null,
      });

      let generationRow: GenerationRow;
      try {
        const result = await provider.generate(body.data.kind, input);
        const { data, error } = await serviceDb
          .from("ai_generations")
          .insert({
            organization_id: ctx.orgId,
            business_id: params.data.businessId,
            requested_by: ctx.userId,
            kind: body.data.kind,
            prompt_version: result.promptVersion,
            input,
            output: result.output,
            model: result.model,
            tokens_used: result.tokensUsed,
            status: "completed",
          })
          .select("id, kind, status, output, model, tokens_used, prompt_version, created_at")
          .single();
        if (error || !data) {
          throw new Error(`generation insert failed: ${error?.message ?? "missing data"}`);
        }
        generationRow = data as GenerationRow;
      } catch (error) {
        if (error instanceof AiError) {
          // Persist the failure too — it counts for rate limiting and cost history.
          await serviceDb.from("ai_generations").insert({
            organization_id: ctx.orgId,
            business_id: params.data.businessId,
            requested_by: ctx.userId,
            kind: body.data.kind,
            prompt_version: "unknown",
            input,
            output: null,
            model: aiConfig.model,
            tokens_used: null,
            status: "failed",
          });
          const mapped = friendlyAiError(error);
          return reply.code(mapped.status).send(mapped.body);
        }
        throw error;
      }

      await serviceDb.from("activities").insert({
        organization_id: ctx.orgId,
        business_id: params.data.businessId,
        actor_id: ctx.userId,
        type: "ai_generated",
        payload: { generation_id: generationRow.id, kind: generationRow.kind },
      });

      return reply.code(201).send({
        generation: toGenerationSummary(generationRow),
      } satisfies GenerateAiResponse);
    } catch (error) {
      if (error instanceof Error && error.name === "RateLimitError") {
        return reply.code(429).send({
          error: "Limite diário de gerações com IA atingido",
          code: "RATE_LIMITED",
        } satisfies ApiErrorBody);
      }
      request.log.error({ err: error }, "ai generation failed");
      return reply.code(500).send({ error: "Erro ao gerar conteúdo" } satisfies ApiErrorBody);
    }
  });
}
