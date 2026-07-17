import { describe, expect, it } from "vitest";
import { calculateOpportunityScore, type ScoreAuditInput, type ScoreBusinessInput } from ".";

const activeBusiness: ScoreBusinessInput = {
  websiteUrl: "https://example.com",
  phone: "+558532241234",
  rating: 4.6,
  reviewCount: 120,
  raw: { segment: "services" },
};

const healthyAudit: ScoreAuditInput = {
  status: "completed",
  isHttps: true,
  detections: {
    siteDown: "not_detected",
    sslError: "not_detected",
    hasViewport: "detected",
    hasTitle: "detected",
    hasDescription: "detected",
    outdated: "not_detected",
    basicBuilder: "not_detected",
  },
};

describe("calculateOpportunityScore", () => {
  it("scores businesses without website with low confidence", () => {
    const result = calculateOpportunityScore({ ...activeBusiness, websiteUrl: null }, null);

    expect(result.score).toBe(60);
    expect(result.level).toBe("high");
    expect(result.confidence).toBe("low");
    expect(result.reasons.map((reason) => reason.code)).toContain("no_site");
    expect(result.suggestedServices).toContain("Criação de site");
    expect(result.algorithmVersion).toBe("v2");
  });

  it("scores social-only presence below no-site", () => {
    const result = calculateOpportunityScore(
      { ...activeBusiness, raw: { socialOnly: true } },
      null,
    );

    expect(result.score).toBe(55);
    expect(result.level).toBe("medium");
    expect(result.reasons.map((reason) => reason.code)).toContain("social_only");
  });

  it("scores broken websites as very high opportunity", () => {
    const result = calculateOpportunityScore(activeBusiness, {
      status: "completed",
      isHttps: true,
      detections: {
        siteDown: "detected",
        sslError: "not_detected",
        hasViewport: "not_detected",
        hasTitle: "not_detected",
        hasDescription: "not_detected",
        outdated: "detected",
        basicBuilder: "not_detected",
      },
    });

    expect(result.score).toBe(80);
    expect(result.level).toBe("very_high");
    expect(result.confidence).toBe("high");
  });

  it("penalizes healthy modern websites", () => {
    const result = calculateOpportunityScore(activeBusiness, healthyAudit);

    expect(result.score).toBe(0);
    expect(result.level).toBe("low");
    expect(result.reasons.map((reason) => reason.code)).toContain("healthy_site");
  });

  it("penalizes inactive businesses", () => {
    const result = calculateOpportunityScore(
      { ...activeBusiness, rating: null, reviewCount: 0, phone: null },
      null,
    );

    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([
      { code: "low_activity", label: "Pouquíssima atividade", impact: -10 },
    ]);
  });

  it("keeps inconclusive audit signals neutral and lowers confidence", () => {
    const result = calculateOpportunityScore(activeBusiness, {
      status: "completed",
      isHttps: true,
      detections: {
        siteDown: "not_detected",
        sslError: "not_detected",
        hasViewport: "inconclusive",
        hasTitle: "inconclusive",
        hasDescription: "inconclusive",
        outdated: "inconclusive",
        basicBuilder: "not_detected",
      },
    });

    expect(result.score).toBe(20);
    expect(result.confidence).toBe("medium");
    expect(result.reasons.map((reason) => reason.code)).not.toContain("weak_metadata");
  });

  it("treats failed audits as medium confidence", () => {
    const result = calculateOpportunityScore(activeBusiness, {
      status: "failed",
      errorCode: "SSRF_BLOCKED",
      isHttps: null,
      detections: {},
    });

    expect(result.confidence).toBe("medium");
    expect(result.score).toBe(20);
  });

  it("clamps score at 100", () => {
    const result = calculateOpportunityScore(
      { ...activeBusiness, websiteUrl: null },
      {
        status: "completed",
        isHttps: false,
        detections: {
          siteDown: "detected",
          sslError: "detected",
          hasViewport: "not_detected",
          hasTitle: "not_detected",
          hasDescription: "not_detected",
          outdated: "detected",
          basicBuilder: "detected",
        },
      },
    );

    expect(result.score).toBe(100);
  });

  it("adds food-service opportunities from platform detections", () => {
    const result = calculateOpportunityScore(
      { ...activeBusiness, raw: { segment: "restaurant" } },
      {
        status: "completed",
        isHttps: true,
        detections: {
          siteDown: "not_detected",
          sslError: "not_detected",
          hasViewport: "detected",
          hasTitle: "detected",
          hasDescription: "detected",
          outdated: "not_detected",
          basicBuilder: "not_detected",
          linkInBio: "detected",
          deliveryPlatform: "detected",
          menuOnline: "not_detected",
        },
      },
    );

    expect(result.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(["link_in_bio_only", "delivery_dependency", "no_menu_online"]),
    );
    expect(result.score).toBe(47);
    expect(result.suggestedServices).toContain("Cardápio online");
  });

  it("does not apply menu or delivery reasons outside food segments", () => {
    const result = calculateOpportunityScore(activeBusiness, {
      status: "completed",
      isHttps: true,
      detections: {
        siteDown: "not_detected",
        sslError: "not_detected",
        hasViewport: "detected",
        hasTitle: "detected",
        hasDescription: "detected",
        outdated: "not_detected",
        basicBuilder: "not_detected",
        deliveryPlatform: "detected",
        menuOnline: "not_detected",
      },
    });

    expect(result.reasons.map((reason) => reason.code)).not.toContain("delivery_dependency");
    expect(result.reasons.map((reason) => reason.code)).not.toContain("no_menu_online");
  });
});
