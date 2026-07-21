import { describe, expect, it } from "vitest";
import { buildManualDiscoveredBusiness, MANUAL_PROVIDER } from "./manual";

const providerPlaceId = "manual-1";

describe("buildManualDiscoveredBusiness", () => {
  it("builds a manual business with an own website", () => {
    const business = buildManualDiscoveredBusiness({
      providerPlaceId,
      name: " Padaria   Central ",
      segment: "Padaria",
      city: " Fortaleza ",
      state: "ce",
      phone: "(85) 3224-1234",
      websiteUrl: "padariacentral.com.br?utm_source=ig",
    });

    expect(business).toMatchObject({
      provider: MANUAL_PROVIDER,
      providerPlaceId,
      name: "Padaria Central",
      city: "Fortaleza",
      state: "CE",
      phone: "+558532241234",
      websiteUrl: "https://padariacentral.com.br/",
      socialOnly: false,
      socialPlatform: null,
      categories: ["Padaria"],
    });
  });

  it("builds a social-only business from an Instagram handle", () => {
    const business = buildManualDiscoveredBusiness({
      providerPlaceId,
      name: "Doceria da Ana",
      segment: "Doceria",
      instagramUrl: "@doceriadaana",
    });

    expect(business.websiteUrl).toBeNull();
    expect(business.socialOnly).toBe(true);
    expect(business.socialPlatform).toBe("instagram.com");
    expect(business.raw).toMatchObject({
      websiteUri: "https://instagram.com/doceriadaana",
      instagramUrl: "https://instagram.com/doceriadaana",
      socialOnly: true,
      socialPlatform: "instagram.com",
    });
  });

  it("keeps the own website when website and Instagram are both present", () => {
    const business = buildManualDiscoveredBusiness({
      providerPlaceId,
      name: "Studio Sol",
      segment: "Servicos",
      websiteUrl: "https://studiosol.com.br",
      instagramUrl: "https://www.instagram.com/studiosol?igsh=abc",
    });

    expect(business.websiteUrl).toBe("https://studiosol.com.br/");
    expect(business.socialOnly).toBe(false);
    expect(business.raw).toMatchObject({
      websiteUri: "https://studiosol.com.br/",
      instagramUrl: "https://www.instagram.com/studiosol",
    });
  });
});
