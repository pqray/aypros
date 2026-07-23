import { aiConfig } from "@aypros/config";
import {
  AiError,
  createGroqContactCopilotProvider,
  type ContactCopilotBriefing,
  type ContactCopilotInput,
  type ContactCopilotProvider,
  type ContactCopilotResult,
  type ContactCopilotTurn,
} from "@aypros/integrations";
import type { ApiErrorBody, ContactCopilotResponse } from "@aypros/types";
import { generateContactCopilotSchema } from "@aypros/validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureAiRateLimit, friendlyAiError, toAiInput, type AuditRow, type BusinessRow, type ScoreRow } from "./ai";
import { env } from "./env";
import { requireOrgContext } from "./org-context";
import { createServiceRoleClient } from "./supabase";
import { timed } from "./timing";

const idParamSchema = z.object({ id: z.string().uuid() });

const BRIEFING_KIND = "commercial_briefing" as const;

type BriefingContentRow = {
  content_json: {
    salesAngle?: string;
    recommendedOffer?: string;
    opportunities?: string[];
    risks?: string[];
  } | null;
};

/** Último briefing de IA gerado pra essa empresa (se houver), usado como plano de abordagem do copiloto (specs/19 P2). */
async function latestContactCopilotBriefing(
  db: SupabaseClient,
  orgId: string,
  businessId: string,
): Promise<ContactCopilotBriefing | null> {
  const { data } = await db
    .from("business_ai_briefings")
    .select("content_json")
    .eq("organization_id", orgId)
    .eq("business_id", businessId)
    .eq("kind", BRIEFING_KIND)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const content = (data as BriefingContentRow | null)?.content_json;
  if (!content) return null;

  return {
    salesAngle: content.salesAngle ?? "",
    recommendedOffer: content.recommendedOffer ?? "",
    opportunities: content.opportunities ?? [],
    risks: content.risks ?? [],
  };
}

export type ContactCopilotRoutesOptions = {
  serviceDb?: SupabaseClient;
  contactCopilotProvider?: ContactCopilotProvider | null;
};

/** Copiloto de contato (fase 19, ADR 016) — provider dedicado, não passa pela rota genérica de ai.ts. */
export function registerContactCopilotRoutes(app: FastifyInstance, options: ContactCopilotRoutesOptions = {}) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();
  const provider =
    options.contactCopilotProvider !== undefined
      ? options.contactCopilotProvider
      : env.GROQ_API_KEY
        ? createGroqContactCopilotProvider({
            apiKey: env.GROQ_API_KEY,
            model: aiConfig.model,
            fallbackModel: aiConfig.fallbackModel,
            timeoutMs: aiConfig.timeoutMs,
            maxTokens: aiConfig.maxContactCopilotTokens,
          })
        : null;

  app.post("/v1/leads/:id/contact-copilot", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = generateContactCopilotSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Descreva a mensagem antes de analisar" } satisfies ApiErrorBody);
    }

    if (!provider) {
      return reply.code(503).send({
        error: "Copiloto de contato não está configurado neste ambiente",
        code: "AI_NOT_CONFIGURED",
      } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      const { data: leadRow, error: leadError } = await timed(request, "copilot.lead", () =>
        ctx.supabase
          .from("leads")
          .select("id, business:businesses(id, name, city, state, categories, rating, review_count, website_url, phone, raw)")
          .eq("organization_id", ctx.orgId)
          .eq("id", params.data.id)
          .maybeSingle(),
      );

      if (leadError) {
        throw new Error(`lead fetch failed: ${leadError.message}`);
      }
      const lead = leadRow as { id: string; business: BusinessRow | null } | null;
      if (!lead || !lead.business) {
        return reply.code(404).send({ error: "Lead não encontrado" } satisfies ApiErrorBody);
      }

      const business = lead.business;

      await timed(request, "ai.rate", () => ensureAiRateLimit(serviceDb, ctx.orgId));

      const [auditResult, scoreResult, profileResult, orgResult, notesResult, briefing] = await timed(
        request,
        "copilot.input",
        () =>
          Promise.all([
            serviceDb
              .from("website_audits")
              .select("status, is_https, response_time_ms, detections")
              .eq("organization_id", ctx.orgId)
              .eq("business_id", business.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            serviceDb
              .from("opportunity_scores")
              .select("score, level, confidence, reasons, suggested_services")
              .eq("business_id", business.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            serviceDb.from("profiles").select("full_name").eq("id", ctx.userId).maybeSingle(),
            serviceDb.from("organizations").select("name").eq("id", ctx.orgId).maybeSingle(),
            ctx.supabase
              .from("notes")
              .select("content")
              .eq("lead_id", params.data.id)
              .order("created_at", { ascending: false })
              .limit(5),
            latestContactCopilotBriefing(serviceDb, ctx.orgId, business.id),
          ]),
      );

      const baseInput = toAiInput({
        business,
        audit: (auditResult.data as AuditRow | null) ?? null,
        score: (scoreResult.data as ScoreRow | null) ?? null,
        senderName: (profileResult.data as { full_name: string | null } | null)?.full_name ?? null,
        organizationName: (orgResult.data as { name: string } | null)?.name ?? null,
      });

      const input: ContactCopilotInput = {
        ...baseInput,
        channel: body.data.channel,
        mode: body.data.mode,
        text: body.data.text,
        history: body.data.history as ContactCopilotTurn[],
        recentNotes: ((notesResult.data ?? []) as Array<{ content: string }>).map((note) => note.content),
        briefing,
      };

      let generationId: string;
      let result: ContactCopilotResult;
      try {
        result = await timed(request, "copilot.provider", () => provider.generate(input));
        const { data: created, error: insertError } = await timed(request, "copilot.insert", () =>
          serviceDb
            .from("ai_generations")
            .insert({
              organization_id: ctx.orgId,
              business_id: business.id,
              lead_id: params.data.id,
              requested_by: ctx.userId,
              kind: "contact_copilot",
              prompt_version: result.promptVersion,
              input,
              output: result.output,
              model: result.model,
              tokens_used: result.tokensUsed,
              status: "completed",
            })
            .select("id")
            .single(),
        );

        if (insertError || !created) {
          throw new Error(`contact copilot generation insert failed: ${insertError?.message ?? "missing data"}`);
        }
        generationId = (created as { id: string }).id;
      } catch (error) {
        if (error instanceof AiError) {
          await serviceDb.from("ai_generations").insert({
            organization_id: ctx.orgId,
            business_id: business.id,
            lead_id: params.data.id,
            requested_by: ctx.userId,
            kind: "contact_copilot",
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
        lead_id: params.data.id,
        business_id: business.id,
        actor_id: ctx.userId,
        type: "ai_generated",
        payload: { generation_id: generationId, kind: "contact_copilot" },
      });

      return reply.code(201).send({
        generationId,
        ...result,
      } satisfies ContactCopilotResponse);
    } catch (error) {
      if (error instanceof Error && error.name === "RateLimitError") {
        return reply.code(429).send({
          error: "Limite diário de gerações com IA atingido",
          code: "RATE_LIMITED",
        } satisfies ApiErrorBody);
      }
      request.log.error({ err: error }, "contact copilot generation failed");
      return reply.code(500).send({ error: "Erro ao analisar a conversa" } satisfies ApiErrorBody);
    }
  });
}
