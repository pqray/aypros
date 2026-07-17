import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerReportRoutes } from "./reports";

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
    contains: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

function createServiceDb(options: { reportCount?: number } = {}) {
  const reportCount = options.reportCount ?? 0;
  return {
    from: vi.fn((table: string) => {
      if (table === "activities") {
        return {
          select: vi.fn(() => queryResult({ count: reportCount, error: null })),
          insert: vi.fn(async () => ({ error: null })),
        };
      }
      if (table === "businesses") {
        return queryResult({
          data: {
            id: "b1",
            name: "Padaria Central",
            address: "Rua A",
            city: "Fortaleza",
            state: "CE",
            phone: "+558532241234",
            website_url: null,
            rating: "4.6",
            review_count: 120,
            categories: ["bakery"],
            raw: {},
          },
          error: null,
        });
      }
      if (table === "website_audits") {
        return queryResult({ data: null, error: null });
      }
      if (table === "opportunity_scores") {
        return queryResult({
          data: {
            score: 75,
            level: "high",
            confidence: "low",
            reasons: [{ code: "no_site", label: "Não possui site próprio", impact: 40 }],
            suggested_services: ["Criação de site"],
            created_at: "2026-07-17T12:00:00Z",
          },
          error: null,
        });
      }
      if (table === "organizations") {
        return queryResult({ data: { name: "Agencia Aypros" }, error: null });
      }
      if (table === "profiles") {
        return queryResult({ data: { full_name: "Rayssa" }, error: null });
      }
      return queryResult({ data: null, error: null });
    }),
  };
}

async function buildTestApp(serviceDb = createServiceDb()) {
  const app = Fastify({ logger: false });
  registerReportRoutes(app, { serviceDb: serviceDb as never });
  await app.ready();
  return app;
}

describe("report routes", () => {
  beforeEach(() => {
    canAccessBusinessMock.mockReset();
    canAccessBusinessMock.mockResolvedValue(true);
  });

  it("returns a PDF for an accessible business", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: `/v1/businesses/${BUSINESS_ID}/report.pdf`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.rawPayload.subarray(0, 4).toString()).toBe("%PDF");

    await app.close();
  });

  it("denies access when the business is not visible to the org", async () => {
    canAccessBusinessMock.mockResolvedValue(false);
    const app = await buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: `/v1/businesses/${BUSINESS_ID}/report.pdf`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Empresa não encontrada" });

    await app.close();
  });

  it("rate limits report downloads per organization", async () => {
    const app = await buildTestApp(createServiceDb({ reportCount: 20 }));

    const response = await app.inject({
      method: "GET",
      url: `/v1/businesses/${BUSINESS_ID}/report.pdf`,
    });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({ code: "RATE_LIMITED" });

    await app.close();
  });
});
