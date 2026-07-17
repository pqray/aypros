import { describe, expect, it } from "vitest";
import { buildWhatsappUrl } from "./outreach";

describe("buildWhatsappUrl", () => {
  it("builds a wa.me URL from E.164 phone and edited text", () => {
    expect(buildWhatsappUrl("+558532241234", "Olá, tudo bem?")).toBe(
      "https://wa.me/558532241234?text=Ol%C3%A1%2C%20tudo%20bem%3F",
    );
  });

  it("returns null when phone is absent or not E.164", () => {
    expect(buildWhatsappUrl(null, "Oi")).toBeNull();
    expect(buildWhatsappUrl("(85) 3224-1234", "Oi")).toBeNull();
  });

  it("encodes and truncates long messages", () => {
    const url = buildWhatsappUrl("+558532241234", "a".repeat(10), 5);
    expect(url).toBe(`https://wa.me/558532241234?text=${encodeURIComponent("aa...")}`);
  });
});
