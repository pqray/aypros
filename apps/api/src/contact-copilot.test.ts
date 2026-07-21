import type { ContactCopilotOutput } from "@aypros/integrations";
import type { LoadedAppContext } from "@aypros/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";

let appContext: LoadedAppContext | null = null;
let ctxSupabase: unknown = null;

vi.mock("./app-context", () => ({
  loadAppContext: vi.fn(async () => appContext),
}));

vi.mock("./supabase", () => ({
  createSupabaseClient: vi.fn(() => ctxSupabase),
  createServiceRoleClient: vi.fn(() => ({ from: vi.fn() })),
}));

function createTableBuilder(result: { data: unknown; error: unknown; count?: number } = { data: null, error: null }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function tableRouter(tables: Record<string, ReturnType<typeof createTableBuilder> | ReturnType<typeof createTableBuilder>[]>) {
  const callCounts: Record<string, number> = {};
  return {
    from: vi.fn((table: string) => {
      const entry = tables[table];
      if (!entry) throw new Error(`no builder configured for table "${table}"`);
      if (Array.isArray(entry)) {
        const index = callCounts[table] ?? 0;
        callCounts[table] = index + 1;
        const builder = entry[Math.min(index, entry.length - 1)];
        if (!builder) throw new Error(`no builder configured for call #${index} of "${table}"`);
        return builder;
      }
      return entry;
    }),
  };
}

const leadId = "11111111-1111-4111-8111-111111111111";

function setOwnerContext(orgId = "org-1", userId = "user-1") {
  appContext = {
    user: { id: userId, email: "owner@example.com" },
    profile: { full_name: "Owner", onboarding_completed_at: new Date().toISOString() },
    organization: { id: orgId, name: "Aypros", slug: "aypros", role: "owner" },
  };
}

describe("POST /v1/leads/:id/contact-copilot", () => {
  afterEach(() => {
    appContext = null;
    ctxSupabase = null;
    vi.clearAllMocks();
  });

  it("rejects a transcript that is too short", async () => {
    setOwnerContext();
    ctxSupabase = tableRouter({});
    const app = buildApp({ contactCopilotProvider: { generate: vi.fn() } });

    const response = await app.inject({
      method: "POST",
      url: `/v1/leads/${leadId}/contact-copilot`,
      payload: { channel: "whatsapp", transcript: "oi" },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("returns 503 when no provider is configured", async () => {
    setOwnerContext();
    ctxSupabase = tableRouter({});
    const app = buildApp({ contactCopilotProvider: null });

    const response = await app.inject({
      method: "POST",
      url: `/v1/leads/${leadId}/contact-copilot`,
      payload: { channel: "whatsapp", transcript: "Conversamos sobre o orçamento do site." },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe("AI_NOT_CONFIGURED");
    await app.close();
  });

  it("requires authentication", async () => {
    appContext = null;
    const app = buildApp({ contactCopilotProvider: { generate: vi.fn() } });

    const response = await app.inject({
      method: "POST",
      url: `/v1/leads/${leadId}/contact-copilot`,
      payload: { channel: "whatsapp", transcript: "Conversamos sobre o orçamento do site." },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("returns 404 when the lead does not belong to the organization", async () => {
    setOwnerContext();
    ctxSupabase = tableRouter({ leads: createTableBuilder({ data: null, error: null }) });
    const app = buildApp({ contactCopilotProvider: { generate: vi.fn() } });

    const response = await app.inject({
      method: "POST",
      url: `/v1/leads/${leadId}/contact-copilot`,
      payload: { channel: "whatsapp", transcript: "Conversamos sobre o orçamento do site." },
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("analyzes the conversation and persists the generation", async () => {
    setOwnerContext();

    ctxSupabase = tableRouter({
      leads: createTableBuilder({
        data: {
          id: leadId,
          business: {
            id: "biz-1",
            name: "Padaria Central",
            city: "Fortaleza",
            state: "CE",
            categories: ["bakery"],
            rating: "4.6",
            review_count: 80,
            website_url: null,
            phone: "+5585999990000",
            raw: {},
          },
        },
        error: null,
      }),
      notes: createTableBuilder({ data: [{ content: "Cliente pediu proposta por escrito." }], error: null }),
    });

    const output: ContactCopilotOutput = {
      summary: "Cliente pediu proposta por escrito.",
      customerPosition: "Interessado, aguardando números.",
      objections: [],
      positiveSignals: ["Pediu proposta"],
      risks: [],
      recommendedReply: "Segue a proposta detalhada.",
      recommendedNextAction: { label: "Enviar proposta", dueInDays: 1, reason: "Cliente está esperando." },
      suggestedLeadPatch: { stage: "proposal_sent", status: null, potentialValue: null },
      noteDraft: "Cliente pediu proposta por escrito — enviar em até 1 dia.",
      confidenceNotes: [],
    };
    const provider = {
      generate: vi.fn(async () => ({
        output,
        model: "test-model",
        tokensUsed: 123,
        promptVersion: "contact-copilot-v1",
      })),
    };

    const serviceDb = tableRouter({
      ai_generations: [
        createTableBuilder({ data: null, error: null, count: 0 }), // rate limit check
        createTableBuilder({ data: { id: "generation-1" }, error: null }), // insert
      ],
      website_audits: createTableBuilder({ data: null, error: null }),
      opportunity_scores: createTableBuilder({ data: null, error: null }),
      profiles: createTableBuilder({ data: { full_name: "Rayssa" }, error: null }),
      organizations: createTableBuilder({ data: { name: "Aypros" }, error: null }),
      activities: createTableBuilder({ data: null, error: null }),
    });

    const app = buildApp({ contactCopilotProvider: provider, serviceDb: serviceDb as never });

    const response = await app.inject({
      method: "POST",
      url: `/v1/leads/${leadId}/contact-copilot`,
      payload: { channel: "whatsapp", transcript: "Conversamos sobre o orçamento do site." },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      generationId: "generation-1",
      output,
      model: "test-model",
      tokensUsed: 123,
      promptVersion: "contact-copilot-v1",
    });

    expect(provider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "whatsapp",
        transcript: "Conversamos sobre o orçamento do site.",
        recentNotes: ["Cliente pediu proposta por escrito."],
        business: expect.objectContaining({ name: "Padaria Central" }),
      }),
    );

    await app.close();
  });
});
