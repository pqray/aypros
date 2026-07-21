import { describe, expect, it, vi } from "vitest";
import {
  createGroqAiProvider,
  createGroqBusinessBriefingProvider,
  mapProviderError,
  type ChatCompletionClient,
  type ChatCompletionParams,
} from "./groq";
import { AiError, type AiInput, type BusinessBriefingInput } from "./types";

const input: AiInput = {
  business: {
    name: "Padaria Central",
    city: "Fortaleza",
    state: "CE",
    categories: ["bakery"],
    rating: 4.6,
    reviewCount: 120,
    hasWebsite: false,
    websiteUrl: null,
    phone: "+5585999990000",
    socialOnly: false,
    socialPlatform: null,
    segment: "food_service",
  },
  audit: null,
  score: {
    score: 82,
    level: "very_high",
    confidence: "medium",
    reasons: [{ code: "no_website", label: "Sem site", impact: 40 }],
    suggestedServices: ["Criação de site"],
  },
  sender: { name: "Rayssa", organization: "Aypros" },
};

function providerWith(client: ChatCompletionClient, fallbackModel?: string) {
  return createGroqAiProvider({
    apiKey: "test",
    model: "model-main",
    fallbackModel,
    timeoutMs: 1000,
    maxTokensByKind: {
      commercial_summary: 1024,
      whatsapp_message: 512,
      email_message: 1024,
      cost_estimate: 256,
    },
    client,
  });
}

describe("createGroqAiProvider", () => {
  it("returns validated output with model, tokens and prompt version", async () => {
    const complete = vi.fn().mockResolvedValue({
      content: JSON.stringify({ message: "Olá! Vi que a Padaria Central ainda não tem site." }),
      tokensUsed: 321,
    });
    const provider = providerWith({ complete });

    const result = await provider.generate("whatsapp_message", input);

    expect(result.output).toEqual({ message: "Olá! Vi que a Padaria Central ainda não tem site." });
    expect(result.model).toBe("model-main");
    expect(result.tokensUsed).toBe(321);
    expect(result.promptVersion).toBe("whatsapp-v4");
    const params = complete.mock.calls[0]?.[0] as ChatCompletionParams;
    expect(params.response_format).toEqual({ type: "json_object" });
    expect(params.max_tokens).toBe(512);
    expect(params.messages.at(-1)?.content).toContain("Padaria Central");
  });

  it("retries once with a corrective instruction on invalid JSON and sums tokens", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ content: "not json at all", tokensUsed: 100 })
      .mockResolvedValueOnce({ content: JSON.stringify({ message: "Olá!" }), tokensUsed: 50 });
    const provider = providerWith({ complete });

    const result = await provider.generate("whatsapp_message", input);

    expect(result.output).toEqual({ message: "Olá!" });
    expect(result.tokensUsed).toBe(150);
    expect(complete).toHaveBeenCalledTimes(2);
    const retryParams = complete.mock.calls[1]?.[0] as ChatCompletionParams;
    expect(retryParams.messages.at(-1)?.content).toContain("inválida");
  });

  it("fails with INVALID_OUTPUT when the corrective retry is still invalid", async () => {
    const complete = vi.fn().mockResolvedValue({
      content: JSON.stringify({ wrong: "shape" }),
      tokensUsed: 10,
    });
    const provider = providerWith({ complete });

    await expect(provider.generate("email_message", input)).rejects.toMatchObject({
      name: "AiError",
      code: "INVALID_OUTPUT",
    });
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("falls back to the secondary model on provider error", async () => {
    const complete = vi
      .fn()
      .mockRejectedValueOnce({ status: 500, message: "server error" })
      .mockResolvedValueOnce({
        content: JSON.stringify({ message: "Olá!" }),
        tokensUsed: 20,
      });
    const provider = providerWith({ complete }, "model-fallback");

    const result = await provider.generate("whatsapp_message", input);

    expect(result.model).toBe("model-fallback");
    expect((complete.mock.calls[1]?.[0] as ChatCompletionParams).model).toBe("model-fallback");
  });

  it("does not fall back on timeout and surfaces a TIMEOUT error", async () => {
    const complete = vi.fn().mockRejectedValue({ name: "APIConnectionTimeoutError" });
    const provider = providerWith({ complete }, "model-fallback");

    await expect(provider.generate("whatsapp_message", input)).rejects.toMatchObject({
      code: "TIMEOUT",
    });
    expect(complete).toHaveBeenCalledTimes(1);
  });
});

describe("createGroqBusinessBriefingProvider", () => {
  const briefingInput: BusinessBriefingInput = {
    ...input,
    report: {
      summary: "Padaria ativa sem site próprio.",
      findings: [],
      recommendations: [{ priority: "alta", text: "Criar site próprio." }],
      nextSteps: ["Validar oferta."],
      httpStatusNote: null,
    },
    pipeline: null,
  };

  function briefingProviderWith(client: ChatCompletionClient) {
    return createGroqBusinessBriefingProvider({
      apiKey: "test",
      model: "model-main",
      timeoutMs: 1000,
      maxTokens: 1536,
      client,
    });
  }

  it("returns a validated business briefing", async () => {
    const output = {
      context: "Padaria Central é uma padaria em Fortaleza com boa reputação.",
      digitalPresence: "Não há site próprio informado nos dados salvos.",
      opportunities: ["Criar uma presença própria para apresentar produtos e contato."],
      risks: ["Não há evidência salva de canal social próprio."],
      salesAngle: "Abordar pelo controle da presença digital.",
      recommendedOffer: "Site institucional simples com SEO local.",
      nextStep: "Validar se já existe canal oficial fora dos dados salvos.",
      confidenceNotes: ["Sem auditoria de site porque não há URL própria."],
    };
    const complete = vi
      .fn()
      .mockResolvedValue({ content: JSON.stringify(output), tokensUsed: 400 });
    const provider = briefingProviderWith({ complete });

    const result = await provider.generate(briefingInput);

    expect(result.output).toEqual(output);
    expect(result.promptVersion).toBe("business-briefing-v2");
    const params = complete.mock.calls[0]?.[0] as ChatCompletionParams;
    expect(params.max_tokens).toBe(1536);
    expect(params.messages[0]?.content).toContain("Não fale de cardápio");
  });

  it("retries invalid briefing output once", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ content: "no json", tokensUsed: 20 })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          context: "Contexto.",
          digitalPresence: "Presença.",
          opportunities: ["Oportunidade."],
          risks: [],
          salesAngle: "Ângulo.",
          recommendedOffer: "Oferta.",
          nextStep: "Próximo passo.",
          confidenceNotes: [],
        }),
        tokensUsed: 30,
      });
    const provider = briefingProviderWith({ complete });

    const result = await provider.generate(briefingInput);

    expect(result.tokensUsed).toBe(50);
    expect(complete).toHaveBeenCalledTimes(2);
  });
});

describe("mapProviderError", () => {
  it("maps HTTP 429 to RATE_LIMITED", () => {
    expect(mapProviderError({ status: 429 })).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("maps timeout-looking errors to TIMEOUT", () => {
    expect(mapProviderError({ message: "Request timed out" })).toMatchObject({ code: "TIMEOUT" });
  });

  it("maps anything else to PROVIDER_ERROR with a friendly message", () => {
    const mapped = mapProviderError(new Error("boom"));
    expect(mapped).toMatchObject({ code: "PROVIDER_ERROR" });
    expect(mapped.message).not.toContain("boom");
  });

  it("passes AiError through unchanged", () => {
    const original = new AiError("INVALID_OUTPUT", "x");
    expect(mapProviderError(original)).toBe(original);
  });
});
