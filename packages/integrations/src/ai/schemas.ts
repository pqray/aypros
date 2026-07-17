import { z } from "zod";
import type { AiKind } from "./types";

const line = (max: number) => z.string().trim().min(1).max(max);

export const commercialSummaryOutputSchema = z.object({
  summary: line(2000),
  painPoints: z.array(line(300)).max(8).default([]),
  salesAngle: line(1000),
});

export const whatsappMessageOutputSchema = z.object({
  message: line(1200),
});

export const emailMessageOutputSchema = z.object({
  subject: line(200),
  body: line(4000),
});

export const aiOutputSchemas: Record<AiKind, z.ZodType> = {
  commercial_summary: commercialSummaryOutputSchema,
  whatsapp_message: whatsappMessageOutputSchema,
  email_message: emailMessageOutputSchema,
};
