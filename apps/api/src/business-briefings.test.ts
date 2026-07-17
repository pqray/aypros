import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerBusinessBriefingRoutes } from "./business-briefings";

const canAccessBusinessMock = vi.fn();
const BUSINESS_ID = "11111111-1111-4111-8111-111111111111";

vi.mock("./audits", () => ({
  canAccessBusiness: (...args: unknown[]) => canAccessBusinessMock(...args),
}));

vi.mock("./org-context", () => ({
  requireOrgContext: () => ({
    supabase: {},
    orgId: "org1",
    userId: "user1",
  }),
}));

function queryResult(result: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

function createServiceDb() {
  const inserted: unknown[] = [];
  return {
    inserted,
    from: vi.fn((table: string) => {
      if (table === "business_ai_briefings") {
        return {
          select: vi.fn(() => queryResult({ data: null, error: null })),
          eq: vi.fn(() => queryResult({ data: null, error: null })),
          insert: vi.fn((payload: Record<string, unknown>) => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                inserted.push(payload);
                return {
                  data: {
                    id: "briefing1",
                    business_id: payload.business_id,
                    kind: payload.kind,
                    content_json: payload.content_json,
                    summary: payload.summary,
                    model: payload.model,
                    prompt_version: payload.prompt_version,
                    source_hash: payload.source_hash,
                    created_at: "2026-07-17T21:00:00Z",
                    updated_at: "2026-07-17T21:00:00Z",
                  },
                  error: null,
                };
              }),
            })),
          })),
        };
      }
      if (table === "businesses") {
        return queryResult({
          data: {
            id: BUSINESS_ID,
            name: "Mais Fitness",
            address: null,
            city: "Macaé",
            state: "RJ",
            phone: null,
            website_url: null,
            rating: "4.8",
            review_count: 42,
            categories: ["gym"],
            raw: { segment: "services" },
          },
          error: null,
        });
      }
      if (table === "website_audits" || table === "opportunity_scores" || table === "leads") {
        return queryResult({ data: null, error: null });
      }
      if (table === "profiles") {
        return queryResult({ data: { full_name: "Rayssa" }, error: null });
      }
      if (table === "organizations") {
        return queryResult({ data: { name: "Aypros" }, error: null });
      }
      if (table === "activities") {
        return { insert: vi.fn(async () => ({ error: null })) };
      }
      return queryResult({ data: null, error: null });
    }),
  };
}

async function buildTestApp(serviceDb = createServiceDb()) {
  const app = Fastify({ logger: false });
  registerBusinessBriefingRoutes(app, {
    serviceDb: serviceDb as never,
    briefingProvider: {
      generate: vi.fn(async () => ({
        output: {
          context: "Mais Fitness é uma academia em Macaé com boa reputação.",
          digitalPresence: "Não há site próprio nos dados salvos.",
          opportunities: ["Criar uma presença própria para captar alunos locais."],
          risks: ["Não há evidência salva de canal social próprio."],
          salesAngle: "Falar sobre controle da presença digital e captação local.",
          recommendedOffer: "Site institucional com SEO local.",
          nextStep: "Validar canais atuais antes da proposta.",
          confidenceNotes: ["Sem auditoria HTTP porque não há site salvo."],
        },
        model: "test-model",
        tokensUsed: 123,
        promptVersion: "business-briefing-v1",
      })),
    },
  });
  await app.ready();
  return app;
}

describe("business briefing routes", () => {
  beforeEach(() => {
    canAccessBusinessMock.mockReset();
    canAccessBusinessMock.mockResolvedValue(true);
  });

  it("returns an empty briefing state with the current source hash", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: `/v1/businesses/${BUSINESS_ID}/briefing`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ briefing: null });
    expect(response.json().sourceHash).toHaveLength(64);

    await app.close();
  });

  it("generates and persists a briefing", async () => {
    const serviceDb = createServiceDb();
    const app = await buildTestApp(serviceDb);

    const response = await app.inject({
      method: "POST",
      url: `/v1/businesses/${BUSINESS_ID}/briefing`,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().briefing).toMatchObject({
      id: "briefing1",
      businessId: BUSINESS_ID,
      promptVersion: "business-briefing-v1",
      isStale: false,
    });
    expect(serviceDb.inserted[0]).toMatchObject({
      organization_id: "org1",
      business_id: BUSINESS_ID,
      kind: "commercial_briefing",
      model: "test-model",
    });

    await app.close();
  });
});
