import type { LoadedAppContext } from "@aypros/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";

let appContext: LoadedAppContext | null = null;

vi.mock("./app-context", () => ({
  loadAppContext: vi.fn(async () => appContext),
}));

function createServiceDb() {
  const fromBuilder = {
    select: vi.fn(() => fromBuilder),
    eq: vi.fn(() => fromBuilder),
    gte: vi.fn(() => fromBuilder),
    insert: vi.fn(() => fromBuilder),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };

  return {
    from: vi.fn(() => fromBuilder),
    rpc: vi.fn(async () => ({
      data: [
        {
          business_id: "11111111-1111-4111-8111-111111111111",
          search_id: "22222222-2222-4222-8222-222222222222",
          created: true,
        },
      ],
      error: null,
    })),
  };
}

const discoveryProvider = {
  name: "test",
  search: vi.fn(async () => ({ businesses: [], nextPageToken: null })),
};

describe("POST /v1/businesses", () => {
  afterEach(() => {
    appContext = null;
    vi.clearAllMocks();
  });

  it("requires an authenticated organization context", async () => {
    const app = buildApp({ discoveryProvider, serviceDb: createServiceDb() as never });

    const response = await app.inject({
      method: "POST",
      url: "/v1/businesses",
      payload: { name: "Doceria", segment: "Doceria", instagramUrl: "@doceria" },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("creates a manual business through the transactional rpc", async () => {
    appContext = {
      user: { id: "33333333-3333-4333-8333-333333333333", email: "user@example.com" },
      profile: { full_name: "Rayssa", onboarding_completed_at: new Date().toISOString() },
      organization: {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Aypros",
        slug: "aypros",
        role: "member",
      },
    };
    const serviceDb = createServiceDb();
    const app = buildApp({ discoveryProvider, serviceDb: serviceDb as never });

    const response = await app.inject({
      method: "POST",
      url: "/v1/businesses",
      payload: { name: "Doceria da Ana", segment: "Doceria", instagramUrl: "@doceriadaana" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      businessId: "11111111-1111-4111-8111-111111111111",
      searchId: "22222222-2222-4222-8222-222222222222",
    });
    expect(serviceDb.rpc).toHaveBeenCalledWith(
      "create_manual_business_api",
      expect.objectContaining({
        p_org_id: "44444444-4444-4444-8444-444444444444",
        p_user_id: "33333333-3333-4333-8333-333333333333",
        p_name: "Doceria da Ana",
        p_website_url: null,
      }),
    );

    await app.close();
  });
});
