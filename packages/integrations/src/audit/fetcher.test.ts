import { describe, expect, it, vi } from "vitest";
import { auditWebsite, type AuditFetch } from "./fetcher";
import { AuditError } from "./types";
import type { DnsResolver } from "./ssrf";

const resolver: DnsResolver = async (hostname) => {
  if (hostname === "localhost") return [{ address: "127.0.0.1", family: 4 }];
  return [{ address: "93.184.216.34", family: 4 }];
};

function response(body: string, init: ResponseInit) {
  return new Response(body, init);
}

describe("auditWebsite", () => {
  it("revalidates redirects through SSRF guard", async () => {
    const fetchImpl = vi.fn(async () =>
      response("", { status: 302, headers: { location: "http://localhost/admin" } }),
    ) as AuditFetch;

    await expect(
      auditWebsite({ url: "https://example.com", fetchImpl, resolver }),
    ).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
  });

  it("returns completed audit with siteDown finding for unreachable sites", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("getaddrinfo ENOTFOUND");
    }) as AuditFetch;

    const result = await auditWebsite({ url: "https://example.com", fetchImpl, resolver });

    expect(result.status).toBe("completed");
    expect(result.errorCode).toBe("FETCH_FAILED");
    expect(result.detections.siteDown.state).toBe("detected");
  });

  it("records non-html responses as completed non_html findings", async () => {
    const fetchImpl = vi.fn(async () =>
      response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    ) as AuditFetch;

    const result = await auditWebsite({ url: "https://example.com", fetchImpl, resolver });

    expect(result.status).toBe("completed");
    expect(result.errorCode).toBe("NON_HTML");
    expect(result.detections.nonHtml.state).toBe("detected");
  });

  it("throws AuditError on timeout", async () => {
    const fetchImpl = vi.fn(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ) as AuditFetch;

    await expect(
      auditWebsite({ url: "https://example.com", fetchImpl, resolver, timeoutMs: 1 }),
    ).rejects.toBeInstanceOf(AuditError);
  });
});
