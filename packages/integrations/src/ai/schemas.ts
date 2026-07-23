import { z } from "zod";
import type { AiKind } from "./types";

const line = (max: number) => z.string().trim().min(1).max(max);

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

export const commercialSummaryOutputSchema = z.object({
  summary: line(2000),
  painPoints: z.array(line(300)).max(8).default([]),
  salesAngle: line(1000),
});

/**
 * summary-v2 (fase 17): análise consultiva estruturada. Limites por seção
 * seguram a verbosidade do modelo; listas vazias são válidas (sem sinal != erro).
 */
export const commercialSummaryV2OutputSchema = z.object({
  context: line(600),
  digitalPresence: line(700),
  strongSignals: z.array(line(220)).max(5).default([]),
  weakSignals: z.array(line(220)).max(5).default([]),
  gaps: z.array(line(220)).max(5).default([]),
  channelDependence: optionalLine(400),
  commercialImpact: line(500),
  recommendedOffer: line(400),
  salesAngle: line(500),
  expectedObjections: z.array(line(220)).max(4).default([]),
  nextStep: line(300),
});

export const whatsappMessageOutputSchema = z.object({
  message: line(1200),
});

export const emailMessageOutputSchema = z.object({
  subject: line(200),
  // email-v6 exige corpo estruturado; bloco raso ou curto demais não passa.
  body: z
    .string()
    .trim()
    .min(450)
    .max(4000)
    .refine(
      (body) =>
        body.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0).length >= 5,
      "EMAIL_BODY_NEEDS_PARAGRAPHS",
    ),
});

export const costEstimateOutputSchema = z.object({
  domainCostAnnual: z.number().min(0).max(1000),
  hostingCostMonthly: z.number().min(15).max(2000),
  marginTargetPercent: z.number().min(10).max(70),
  rationale: line(300),
});

export const businessBriefingOutputSchema = z.object({
  context: line(700),
  digitalPresence: line(800),
  opportunities: z.array(line(240)).min(1).max(5),
  risks: z.array(line(240)).max(5).default([]),
  salesAngle: line(600),
  recommendedOffer: line(500),
  nextStep: line(350),
  confidenceNotes: z.array(line(220)).max(5).default([]),
});

const contactCopilotStageSchema = z
  .enum(["new", "contacted", "in_conversation", "proposal_sent", "won", "lost"])
  .nullable();
const contactCopilotStatusSchema = z.enum(["active", "won", "lost", "archived"]).nullable();

/** Avaliação de uma mensagem do vendedor antes de enviar (mode: evaluate_message, fase 19 P2). */
export const contactCopilotEvaluationOutputSchema = z.object({
  alignment: z.enum(["aligned", "partial", "off_track"]),
  score: z.number().int().min(1).max(5),
  strengths: z.array(line(220)).max(5).default([]),
  risks: z.array(line(220)).max(5).default([]),
  suggestedRevision: optionalLine(1200),
  rationale: line(400),
});

export const contactCopilotOutputSchema = z.object({
  summary: line(400),
  customerPosition: line(400),
  objections: z.array(line(220)).max(6).default([]),
  positiveSignals: z.array(line(220)).max(6).default([]),
  risks: z.array(line(220)).max(6).default([]),
  recommendedReply: line(1200),
  recommendedNextAction: z.object({
    label: line(200),
    dueInDays: z.number().int().min(0).max(90),
    reason: line(300),
  }),
  suggestedLeadPatch: z.object({
    stage: contactCopilotStageSchema.optional().transform((value) => value ?? null),
    status: contactCopilotStatusSchema.optional().transform((value) => value ?? null),
    potentialValue: z.number().min(0).max(1_000_000_000).nullable().optional().transform((value) => value ?? null),
  }),
  noteDraft: line(1000),
  confidenceNotes: z.array(line(220)).max(5).default([]),
});

export const aiOutputSchemas: Record<AiKind, z.ZodType> = {
  commercial_summary: commercialSummaryV2OutputSchema,
  whatsapp_message: whatsappMessageOutputSchema,
  email_message: emailMessageOutputSchema,
  cost_estimate: costEstimateOutputSchema,
};
