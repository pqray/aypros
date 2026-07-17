import { describe, expect, it } from "vitest";
import {
  aiOutputSchemas,
  commercialSummaryOutputSchema,
  commercialSummaryV2OutputSchema,
  emailMessageOutputSchema,
  whatsappMessageOutputSchema,
} from "./schemas";

const validSummaryV2 = {
  context: "Padaria em Fortaleza com boa reputação no Google.",
  digitalPresence: "Sem site próprio; presença via plataforma de delivery detectada.",
  strongSignals: ["Nota 4.7 com 213 avaliações"],
  weakSignals: ["Telefone fixo, sem WhatsApp confirmado"],
  gaps: ["Não foi possível verificar redes sociais próprias"],
  channelDependence: "Provável dependência do iFood para pedidos.",
  commercialImpact: "Clientes diretos acabam indo para concorrentes com site.",
  recommendedOffer: "Site institucional com cardápio próprio.",
  salesAngle: "Reduzir a comissão de plataforma capturando pedidos diretos.",
  expectedObjections: ["Já estou no iFood — responder com custo de comissão"],
  nextStep: "Mandar mensagem citando a reputação e oferecer análise gratuita.",
};

describe("commercialSummaryV2OutputSchema", () => {
  it("accepts a complete consultive analysis", () => {
    const result = commercialSummaryV2OutputSchema.safeParse(validSummaryV2);
    expect(result.success).toBe(true);
  });

  it("is the active schema for commercial_summary generations", () => {
    expect(aiOutputSchemas.commercial_summary.safeParse(validSummaryV2).success).toBe(true);
  });

  it("accepts empty signal lists and null channel dependence (sem sinal não é erro)", () => {
    const result = commercialSummaryV2OutputSchema.safeParse({
      ...validSummaryV2,
      strongSignals: [],
      weakSignals: [],
      gaps: [],
      expectedObjections: [],
      channelDependence: null,
    });
    expect(result.success).toBe(true);
    expect(result.success && result.data.channelDependence).toBeNull();
  });

  it("normalizes a missing/empty channelDependence to null", () => {
    const { channelDependence: _omitted, ...withoutChannel } = validSummaryV2;
    const result = commercialSummaryV2OutputSchema.safeParse(withoutChannel);
    expect(result.success).toBe(true);
    expect(result.success && result.data.channelDependence).toBeNull();

    const empty = commercialSummaryV2OutputSchema.safeParse({
      ...validSummaryV2,
      channelDependence: "  ",
    });
    expect(empty.success && empty.data.channelDependence).toBeNull();
  });

  it("rejects a partial analysis missing nextStep or commercialImpact", () => {
    const { nextStep: _n, ...withoutNext } = validSummaryV2;
    expect(commercialSummaryV2OutputSchema.safeParse(withoutNext).success).toBe(false);
    const { commercialImpact: _c, ...withoutImpact } = validSummaryV2;
    expect(commercialSummaryV2OutputSchema.safeParse(withoutImpact).success).toBe(false);
  });

  it("rejects an over-verbose section (limite anti-verborragia)", () => {
    expect(
      commercialSummaryV2OutputSchema.safeParse({
        ...validSummaryV2,
        commercialImpact: "x".repeat(501),
      }).success,
    ).toBe(false);
    expect(
      commercialSummaryV2OutputSchema.safeParse({
        ...validSummaryV2,
        strongSignals: Array.from({ length: 6 }, (_, i) => `sinal ${i}`),
      }).success,
    ).toBe(false);
  });
});

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
  const richBody = [
    "Olá, equipe da Padaria Central! Vi a nota 4.7 de vocês no Google e fiquei impressionada com a reputação que construíram em Fortaleza.",
    "Ao analisar a presença digital de vocês, notei que ainda não há um site próprio — hoje quem procura a padaria encontra apenas o perfil no Google, sem um lugar que apresente o cardápio e os diferenciais de vocês.",
    "Na prática, isso significa que clientes novos podem acabar indo para concorrentes que aparecem com site completo na busca.",
    "Nós criamos sites simples e rápidos para negócios locais, com cardápio e botão de pedido direto pelo WhatsApp — vocês passam a controlar o próprio canal.",
    "Que tal uma conversa rápida de 15 minutos para eu mostrar uma análise gratuita que preparei?",
    "Abraços,\nRayssa\nAypros",
  ].join("\n\n");

  it("accepts a structured multi-paragraph body (email-v3)", () => {
    const result = emailMessageOutputSchema.safeParse({
      subject: "Uma ideia para a Padaria Central",
      body: richBody,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a shallow one-liner body", () => {
    expect(
      emailMessageOutputSchema.safeParse({
        subject: "Assunto",
        body: "Olá, vi que vocês ainda não têm site...",
      }).success,
    ).toBe(false);
  });

  it("rejects a partial output with only the subject", () => {
    expect(emailMessageOutputSchema.safeParse({ subject: "Assunto" }).success).toBe(false);
  });
});
