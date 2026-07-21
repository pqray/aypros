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
  createServiceRoleClient: vi.fn(() => ({ schema: vi.fn(), from: vi.fn() })),
}));

function createTableBuilder(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function createCtxSupabase(tables: Record<string, ReturnType<typeof createTableBuilder>>) {
  return {
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => {
        const builder = tables[table];
        if (!builder) throw new Error(`no builder configured for table "${table}"`);
        return builder;
      }),
    })),
  };
}

function setOwnerContext(orgId = "org-1", userId = "user-1") {
  appContext = {
    user: { id: userId, email: "owner@example.com" },
    profile: { full_name: "Owner", onboarding_completed_at: new Date().toISOString() },
    organization: { id: orgId, name: "Aypros", slug: "aypros", role: "owner" },
  };
}

function setMemberContext(orgId = "org-1", userId = "user-1") {
  appContext = {
    user: { id: userId, email: "member@example.com" },
    profile: { full_name: "Member", onboarding_completed_at: new Date().toISOString() },
    organization: { id: orgId, name: "Aypros", slug: "aypros", role: "member" },
  };
}

describe("AYhub routes authorization", () => {
  afterEach(() => {
    appContext = null;
    ctxSupabase = null;
    vi.clearAllMocks();
  });

  it("blocks a plain member from listing clients", async () => {
    setMemberContext();
    const app = buildApp({});

    const response = await app.inject({ method: "GET", url: "/v1/ayhub/clients" });

    expect(response.statusCode).toBe(403);
    expect(response.json().error).toMatch(/owners e admins/i);
    await app.close();
  });

  it("blocks a plain member from creating a site under a client", async () => {
    setMemberContext();
    const app = buildApp({});

    const response = await app.inject({
      method: "POST",
      url: "/v1/ayhub/clients/11111111-1111-4111-8111-111111111111/sites",
      payload: { slug: "padaria-central" },
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("blocks an unauthenticated request", async () => {
    appContext = null;
    const app = buildApp({});

    const response = await app.inject({ method: "GET", url: "/v1/ayhub/clients" });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("lets an owner list clients", async () => {
    setOwnerContext();
    ctxSupabase = createCtxSupabase({
      clients: createTableBuilder({
        data: [
          {
            id: "client-1",
            name: "Padaria Central",
            contact: null,
            maintenance_value: "150",
            status: "active",
            origin: "manual",
            start_date: "2026-07-20T00:00:00Z",
            origin_lead_id: null,
            created_at: "2026-07-20T00:00:00Z",
          },
        ],
        error: null,
      }),
      sites: createTableBuilder({ data: [], error: null }),
    });
    const app = buildApp({});

    const response = await app.inject({ method: "GET", url: "/v1/ayhub/clients" });

    expect(response.statusCode).toBe(200);
    expect(response.json().items).toEqual([
      expect.objectContaining({ id: "client-1", name: "Padaria Central", sitesCount: 0 }),
    ]);
    await app.close();
  });

  it("lets an owner create a manual client", async () => {
    setOwnerContext();
    ctxSupabase = createCtxSupabase({
      clients: createTableBuilder({
        data: {
          id: "client-new",
          name: "Doceria da Ana",
          contact: null,
          maintenance_value: null,
          status: "active",
          origin: "manual",
          start_date: "2026-07-20T00:00:00Z",
          origin_lead_id: null,
          created_at: "2026-07-20T00:00:00Z",
        },
        error: null,
      }),
    });
    const app = buildApp({});

    const response = await app.inject({
      method: "POST",
      url: "/v1/ayhub/clients",
      payload: { name: "Doceria da Ana" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ id: "client-new", name: "Doceria da Ana", origin: "manual" });
    await app.close();
  });

  it("rejects an invalid manual client payload", async () => {
    setOwnerContext();
    ctxSupabase = createCtxSupabase({});
    const app = buildApp({});

    const response = await app.inject({
      method: "POST",
      url: "/v1/ayhub/clients",
      payload: { name: "" },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("loads the dashboard when client start_date is a full timestamp", async () => {
    setOwnerContext();
    ctxSupabase = createCtxSupabase({
      clients: createTableBuilder({
        data: [
          {
            id: "client-1",
            name: "Padaria Central",
            maintenance_value: "150",
            status: "active",
            start_date: "2026-07-20T00:00:00Z",
          },
        ],
        error: null,
      }),
      sites: createTableBuilder({
        data: [{ id: "site-1", client_id: "client-1", slug: "padaria-central", status: "development" }],
        error: null,
      }),
      site_costs: createTableBuilder({ data: [], error: null }),
    });
    const app = buildApp({});

    const response = await app.inject({ method: "GET", url: "/v1/ayhub/dashboard" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      totalActiveSites: 1,
      grossMrr: 150,
      netMrr: 150,
    });
    await app.close();
  });
});
