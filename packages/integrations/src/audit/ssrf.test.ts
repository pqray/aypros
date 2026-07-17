import { describe, expect, it } from "vitest";
import { AuditError } from "./types";
import { assertSafeUrl, isBlockedIp, type DnsResolver } from "./ssrf";
import { normalizeAuditUrl } from "./url";

const publicResolver: DnsResolver = async () => [{ address: "93.184.216.34", family: 4 }];

describe("normalizeAuditUrl", () => {
  it("defaults to https and normalizes host casing", () => {
    const url = normalizeAuditUrl("Example.COM/path");

    expect(url.toString()).toBe("https://example.com/path");
  });

  it("rejects non-http protocols", () => {
    expect(() => normalizeAuditUrl("file:///etc/passwd")).toThrow(AuditError);
  });
});

describe("SSRF guard", () => {
  it.each([
    "10.0.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "192.168.1.10",
    "172.16.0.1",
    "::1",
    "fc00::1",
  ])("blocks internal IP %s", (address) => {
    expect(isBlockedIp(address)).toBe(true);
  });

  it("blocks localhost", async () => {
    await expect(assertSafeUrl("http://localhost", publicResolver)).rejects.toMatchObject({
      code: "SSRF_BLOCKED",
    });
  });

  it("blocks hostnames resolving to private addresses", async () => {
    await expect(
      assertSafeUrl("https://example.com", async () => [{ address: "10.0.0.5", family: 4 }]),
    ).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
  });

  it("allows public addresses", async () => {
    const url = await assertSafeUrl("https://example.com", publicResolver);

    expect(url.hostname).toBe("example.com");
  });
});
