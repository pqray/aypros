import { describe, expect, it } from "vitest";
import { toAiInput } from "./ai";

const business = {
  id: "b1",
  name: "Padaria Central",
  city: "Fortaleza",
  state: "CE",
  categories: ["bakery", "cafe"],
  rating: "4.6",
  review_count: 120,
  website_url: "https://padariacentral.com.br",
  phone: "+5585999990000",
  raw: { segment: "food_service" },
};

describe("toAiInput", () => {
  it("assembles business, audit, score and sender into the structured input", () => {
    const input = toAiInput({
      business,
      audit: {
        status: "completed",
        is_https: true,
        response_time_ms: 850,
        detections: {
          hasViewport: { state: "detected" },
          outdated: { state: "inconclusive" },
          deliveryPlatform: { state: "detected", evidence: { id: "ifood" } },
        },
      },
      score: {
        score: 72,
        level: "high",
        confidence: "medium",
        reasons: [{ code: "slow_site", label: "Site lento", impact: 15 }],
        suggested_services: ["Otimização de performance"],
      },
      senderName: "Rayssa",
      organizationName: "Aypros",
    });

    expect(input.business).toEqual({
      name: "Padaria Central",
      city: "Fortaleza",
      state: "CE",
      categories: ["bakery", "cafe"],
      rating: 4.6,
      reviewCount: 120,
      hasWebsite: true,
      websiteUrl: "https://padariacentral.com.br",
      phone: "+5585999990000",
      segment: "food_service",
    });
    expect(input.audit).toEqual({
      status: "completed",
      isHttps: true,
      responseTimeMs: 850,
      findings: [
        { code: "hasViewport", state: "detected" },
        { code: "outdated", state: "inconclusive" },
        { code: "deliveryPlatform", state: "detected" },
      ],
      platforms: [{ code: "deliveryPlatform", state: "detected", evidence: { id: "ifood" } }],
    });
    expect(input.score?.reasons).toEqual([{ code: "slow_site", label: "Site lento", impact: 15 }]);
    expect(input.sender).toEqual({ name: "Rayssa", organization: "Aypros" });
  });

  it("handles a business without website, audit or score", () => {
    const input = toAiInput({
      business: { ...business, website_url: "  ", rating: null, categories: null },
      audit: null,
      score: null,
      senderName: null,
      organizationName: null,
    });

    expect(input.business.hasWebsite).toBe(false);
    expect(input.business.rating).toBeNull();
    expect(input.business.categories).toEqual([]);
    expect(input.business.segment).toBe("food_service");
    expect(input.audit).toBeNull();
    expect(input.score).toBeNull();
    expect(input.sender).toEqual({ name: null, organization: null });
  });

  it("normalizes unknown detection states to inconclusive", () => {
    const input = toAiInput({
      business,
      audit: {
        status: "partial",
        is_https: null,
        response_time_ms: null,
        detections: { weird: { state: "banana" }, missing: {} },
      },
      score: null,
      senderName: null,
      organizationName: null,
    });

    expect(input.audit?.findings).toEqual([
      { code: "weird", state: "inconclusive" },
      { code: "missing", state: "inconclusive" },
    ]);
    expect(input.audit?.platforms).toEqual([]);
  });
});
