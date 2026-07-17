import { describe, expect, it } from "vitest";
import { normalizePhone, normalizeWebsite, normalizeWhitespace } from "./normalize";

describe("normalizeWhitespace", () => {
  it("collapses internal whitespace and trims", () => {
    expect(normalizeWhitespace("  Padaria   Central \n Ltda ")).toBe("Padaria Central Ltda");
  });
});

describe("normalizePhone", () => {
  it("converts BR landline (10 digits) to E.164", () => {
    expect(normalizePhone("(85) 3224-1234")).toBe("+558532241234");
  });

  it("converts BR mobile (11 digits) to E.164", () => {
    expect(normalizePhone("85 98765-4321")).toBe("+5585987654321");
  });

  it("keeps international numbers with plus sign", () => {
    expect(normalizePhone("+55 85 98765-4321")).toBe("+5585987654321");
    expect(normalizePhone("+1 212 555 0100")).toBe("+12125550100");
  });

  it("accepts 55-prefixed digits without plus", () => {
    expect(normalizePhone("5585987654321")).toBe("+5585987654321");
  });

  it("returns null for ambiguous or empty input", () => {
    expect(normalizePhone("1234")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

describe("normalizeWebsite", () => {
  it("adds https scheme when missing", () => {
    expect(normalizeWebsite("padariacentral.com.br")).toEqual({
      websiteUrl: "https://padariacentral.com.br/",
      socialOnly: false,
    });
  });

  it("removes tracking params and fragments", () => {
    const result = normalizeWebsite(
      "https://loja.com/produtos?utm_source=google&utm_medium=cpc&id=9&fbclid=abc#topo",
    );
    expect(result.websiteUrl).toBe("https://loja.com/produtos?id=9");
    expect(result.socialOnly).toBe(false);
  });

  it("classifies social profiles as social_only without website", () => {
    for (const url of [
      "https://www.instagram.com/padariacentral",
      "https://facebook.com/padariacentral",
      "https://linktr.ee/padaria",
      "https://wa.me/5585987654321",
    ]) {
      expect(normalizeWebsite(url)).toEqual({ websiteUrl: null, socialOnly: true });
    }
  });

  it("does not treat lookalike domains as social", () => {
    const result = normalizeWebsite("https://notinstagram.com.br");
    expect(result.socialOnly).toBe(false);
    expect(result.websiteUrl).toBe("https://notinstagram.com.br/");
  });

  it("rejects non-http protocols and invalid urls", () => {
    expect(normalizeWebsite("ftp://arquivo.com")).toEqual({ websiteUrl: null, socialOnly: false });
    expect(normalizeWebsite("http://")).toEqual({ websiteUrl: null, socialOnly: false });
    expect(normalizeWebsite("")).toEqual({ websiteUrl: null, socialOnly: false });
    expect(normalizeWebsite(null)).toEqual({ websiteUrl: null, socialOnly: false });
  });
});
