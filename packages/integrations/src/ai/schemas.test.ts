import { describe, expect, it } from "vitest";
import {
  commercialSummaryOutputSchema,
  emailMessageOutputSchema,
  whatsappMessageOutputSchema,
} from "./schemas";

describe("commercialSummaryOutputSchema", () => {
  it("accepts a complete valid output", () => {
    const result = commercialSummaryOutputSchema.safeParse({
      summary: "Padaria sem site, com boa reputação no Google.",
      painPoints: ["Sem presença digital própria", "Concorrentes aparecem primeiro"],
      salesAngle: "Site simples com cardápio e pedidos pelo WhatsApp.",
    });
    expect(result.success).toBe(true);
  });

  it("defaults painPoints to an empty array when missing", () => {
    const result = commercialSummaryOutputSchema.safeParse({
      summary: "Resumo.",
      salesAngle: "Ângulo.",
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.painPoints).toEqual([]);
  });

  it("rejects a partial output without salesAngle", () => {
    const result = commercialSummaryOutputSchema.safeParse({ summary: "Só o resumo." });
    expect(result.success).toBe(false);
  });

  it("rejects empty strings and non-string pain points", () => {
    expect(
      commercialSummaryOutputSchema.safeParse({
        summary: "",
        painPoints: [],
        salesAngle: "x",
      }).success,
    ).toBe(false);
    expect(
      commercialSummaryOutputSchema.safeParse({
        summary: "ok",
        painPoints: [42],
        salesAngle: "x",
      }).success,
    ).toBe(false);
  });

  it("rejects more than 8 pain points", () => {
    const result = commercialSummaryOutputSchema.safeParse({
      summary: "ok",
      painPoints: Array.from({ length: 9 }, (_, i) => `dor ${i}`),
      salesAngle: "x",
    });
    expect(result.success).toBe(false);
  });
});

describe("whatsappMessageOutputSchema", () => {
  it("accepts a valid message and trims it", () => {
    const result = whatsappMessageOutputSchema.safeParse({ message: "  Olá! Tudo bem?  " });
    expect(result.success).toBe(true);
    expect(result.success && result.data.message).toBe("Olá! Tudo bem?");
  });

  it("rejects an empty or missing message", () => {
    expect(whatsappMessageOutputSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(whatsappMessageOutputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a message above the size cap", () => {
    expect(whatsappMessageOutputSchema.safeParse({ message: "a".repeat(1201) }).success).toBe(false);
  });
});

describe("emailMessageOutputSchema", () => {
  it("accepts subject and body", () => {
    const result = emailMessageOutputSchema.safeParse({
      subject: "Uma ideia para a Padaria Central",
      body: "Olá, vi que vocês ainda não têm site...",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a partial output with only the subject", () => {
    expect(emailMessageOutputSchema.safeParse({ subject: "Assunto" }).success).toBe(false);
  });
});
