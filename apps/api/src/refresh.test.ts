import { describe, expect, it } from "vitest";
import { mergeBusinessRefresh, shouldProcessRefreshCandidate, staleBefore } from "./refresh";

describe("mergeBusinessRefresh", () => {
  it("keeps existing values when details are partial", () => {
    const merged = mergeBusinessRefresh(
      {
        id: "b1",
        provider: "google_places",
        provider_place_id: "place-1",
        name: "Padaria Central",
        address: "Rua A",
        city: "Fortaleza",
        state: "CE",
        phone: "+558500000000",
        website_url: "https://padaria.example",
        rating: "4.5",
        review_count: 120,
        categories: ["bakery"],
        lat: "-3.7",
        lng: "-38.5",
        raw: { existing: true },
      },
      {
        provider: "google_places",
        providerPlaceId: "place-1",
        name: "Padaria Central Atualizada",
        address: null,
        city: null,
        state: null,
        phone: null,
        websiteUrl: null,
        socialOnly: false,
        socialPlatform: null,
        rating: null,
        reviewCount: null,
        categories: [],
        lat: null,
        lng: null,
        raw: { id: "place-1" },
      },
      "2026-07-17T12:00:00.000Z",
    );

    expect(merged).toMatchObject({
      name: "Padaria Central Atualizada",
      address: "Rua A",
      city: "Fortaleza",
      phone: "+558500000000",
      website_url: "https://padaria.example",
      rating: "4.5",
      review_count: 120,
      categories: ["bakery"],
      provider_status: "active",
      refreshed_at: "2026-07-17T12:00:00.000Z",
    });
    expect(merged.raw).toMatchObject({ existing: true, id: "place-1" });
  });
});

describe("staleBefore", () => {
  it("returns the ISO cutoff for the configured freshness window", () => {
    expect(staleBefore(30, new Date("2026-07-17T12:00:00.000Z"))).toBe(
      "2026-06-17T12:00:00.000Z",
    );
  });
});

describe("shouldProcessRefreshCandidate", () => {
  it("allows place refresh while the daily cap has room", () => {
    expect(
      shouldProcessRefreshCandidate({ needs_places: true, needs_audit: false }, 29),
    ).toEqual({
      canRefreshPlaces: true,
      shouldProcess: true,
    });
  });

  it("cuts paid place refresh when the daily cap is reached", () => {
    expect(
      shouldProcessRefreshCandidate({ needs_places: true, needs_audit: false }, 30),
    ).toEqual({
      canRefreshPlaces: false,
      shouldProcess: false,
    });
  });

  it("continues free audits when the paid cap is reached", () => {
    expect(
      shouldProcessRefreshCandidate({ needs_places: true, needs_audit: true }, 30),
    ).toEqual({
      canRefreshPlaces: false,
      shouldProcess: true,
    });
  });
});
