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
 * seguram a verbosidade do modelo; listas vazias são válidas (sem sinal ≠ erro).
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
  body: line(4000),
});

export const aiOutputSchemas: Record<AiKind, z.ZodType> = {
  commercial_summary: commercialSummaryV2OutputSchema,
  whatsapp_message: whatsappMessageOutputSchema,
  email_message: emailMessageOutputSchema,
};
