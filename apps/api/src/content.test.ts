import { describe, expect, it, vi } from "vitest";
import { buildApp } from "./app";
import { hashSiteKey } from "./ayhub-service";

type BuilderResult = { data: unknown; error: unknown };

function createBuilder({
  maybeSingleResult,
  awaitResult,
}: { maybeSingleResult?: BuilderResult | null; awaitResult?: BuilderResult } = {}) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => maybeSingleResult ?? { data: null, error: null }),
    then: (resolve: (value: BuilderResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(awaitResult ?? { data: null, error: null }).then(resolve, reject),
  };
  return builder;
}

function createServiceDb({
  siteKeyLookup,
  contentBlocks,
}: {
  siteKeyLookup?: BuilderResult | null;
  contentBlocks?: BuilderResult;
}) {
  const siteKeysLookupBuilder = createBuilder({ maybeSingleResult: siteKeyLookup });
  const siteKeysUpdateBuilder = createBuilder({ awaitResult: { data: null, error: null } });
  const contentBlocksBuilder = createBuilder({ awaitResult: contentBlocks });
  let siteKeysCalls = 0;

  return {
    schema: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "content_blocks") return contentBlocksBuilder;
        if (table === "site_keys") {
          siteKeysCalls += 1;
          return siteKeysCalls === 1 ? siteKeysLookupBuilder : siteKeysUpdateBuilder;
        }
        throw new Error(`unexpected table ${table}`);
      }),
    })),
    __builders: { siteKeysLookupBuilder, siteKeysUpdateBuilder, contentBlocksBuilder },
  };
}

describe("GET /v1/content", () => {
  it("rejects a request without a SITE_KEY", async () => {
    const serviceDb = createServiceDb({ siteKeyLookup: null, contentBlocks: { data: [], error: null } });
    const app = buildApp({ serviceDb: serviceDb as never });

    const response = await app.inject({ method: "GET", url: "/v1/content" });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toMatch(/ausente/i);
    await app.close();
  });

  it("rejects an unknown or revoked SITE_KEY", async () => {
    const serviceDb = createServiceDb({
      siteKeyLookup: { data: null, error: null },
      contentBlocks: { data: [], error: null },
    });
    const app = buildApp({ serviceDb: serviceDb as never });

    const response = await app.inject({
      method: "GET",
      url: "/v1/content",
      headers: { authorization: "Bearer ayh_does-not-exist" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toMatch(/inválida ou revogada/i);
    await app.close();
  });

  it("returns only published values for a valid key, and touches last_used_at", async () => {
    const serviceDb = createServiceDb({
      siteKeyLookup: { data: { id: "key-1", site_id: "site-1" }, error: null },
      contentBlocks: {
        data: [
          { key: "seo.title", published_value: "Padaria Central" },
          { key: "seo.description", published_value: null },
        ],
        error: null,
      },
    });
    const app = buildApp({ serviceDb: serviceDb as never });

    const response = await app.inject({
      method: "GET",
      url: "/v1/content",
      headers: { authorization: "Bearer ayh_valid-plaintext-key" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      blocks: { "seo.title": "Padaria Central", "seo.description": null },
    });
    expect(response.headers["cache-control"]).toContain("private");

    expect(serviceDb.__builders.siteKeysLookupBuilder.eq).toHaveBeenCalledWith(
      "key_hash",
      hashSiteKey("ayh_valid-plaintext-key"),
    );
    expect(serviceDb.__builders.contentBlocksBuilder.eq).toHaveBeenCalledWith("site_id", "site-1");
    expect(serviceDb.__builders.siteKeysUpdateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_used_at: expect.any(String) }),
    );

    await app.close();
  });
});
