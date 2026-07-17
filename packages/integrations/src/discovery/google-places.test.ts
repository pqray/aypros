import { describe, expect, it, vi } from "vitest";
import { createGooglePlacesProvider } from "./google-places";
import { DiscoveryError } from "./types";

const placeFixture = {
  id: "ChIJabc123",
  displayName: { text: "  Padaria   Central " },
  formattedAddress: "Rua das Flores, 100 - Centro, Fortaleza - CE, 60000-000, Brasil",
  addressComponents: [
    { longText: "Fortaleza", shortText: "Fortaleza", types: ["administrative_area_level_2"] },
    { longText: "Ceará", shortText: "CE", types: ["administrative_area_level_1"] },
    { longText: "Brasil", shortText: "BR", types: ["country"] },
  ],
  nationalPhoneNumber: "(85) 3224-1234",
  internationalPhoneNumber: "+55 85 3224-1234",
  websiteUri: "https://padariacentral.com.br/?utm_source=gmb",
  rating: 4.6,
  userRatingCount: 321,
  types: ["bakery", "food"],
  location: { latitude: -3.7275, longitude: -38.5262 },
};

const socialPlaceFixture = {
  id: "ChIJdef456",
  displayName: { text: "Doceria da Ana" },
  addressComponents: [],
  websiteUri: "https://www.instagram.com/doceriadaana",
  types: ["bakery"],
};

function fetchResponding(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

describe("createGooglePlacesProvider", () => {
  it("maps places to normalized businesses", async () => {
    const fetchFn = fetchResponding(200, {
      places: [placeFixture, socialPlaceFixture],
      nextPageToken: "token-2",
    });
    const provider = createGooglePlacesProvider({ apiKey: "k", fetchFn });

    const page = await provider.search({ city: "Fortaleza", state: "CE", segment: "padarias" });

    expect(page.nextPageToken).toBe("token-2");
    expect(page.businesses).toHaveLength(2);

    const [padaria, doceria] = page.businesses;
    expect(padaria).toMatchObject({
      provider: "google_places",
      providerPlaceId: "ChIJabc123",
      name: "Padaria Central",
      city: "Fortaleza",
      state: "CE",
      phone: "+558532241234",
      websiteUrl: "https://padariacentral.com.br/",
      socialOnly: false,
      rating: 4.6,
      reviewCount: 321,
      categories: ["bakery", "food"],
      lat: -3.7275,
      lng: -38.5262,
    });
    expect(padaria?.raw).toMatchObject({ id: "ChIJabc123" });

    expect(doceria).toMatchObject({
      providerPlaceId: "ChIJdef456",
      websiteUrl: null,
      socialOnly: true,
      phone: null,
      city: null,
      state: null,
    });
  });

  it("sends text query, region and page token to the API", async () => {
    const fetchFn = fetchResponding(200, { places: [] });
    const provider = createGooglePlacesProvider({ apiKey: "secret-key", fetchFn });

    await provider.search({
      city: "Sobral",
      state: "CE",
      segment: "clínicas",
      pageToken: "tok",
      limit: 10,
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("places:searchText");
    expect((init.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe("secret-key");
    expect(JSON.parse(init.body as string)).toMatchObject({
      textQuery: "clínicas em Sobral - CE",
      regionCode: "BR",
      languageCode: "pt-BR",
      pageSize: 10,
      pageToken: "tok",
    });
  });

  it("fetches place details by place id with the minimal field mask", async () => {
    const fetchFn = fetchResponding(200, placeFixture);
    const provider = createGooglePlacesProvider({ apiKey: "secret-key", fetchFn });

    const business = await provider.getDetails("ChIJabc123");

    expect(business).toMatchObject({
      providerPlaceId: "ChIJabc123",
      name: "Padaria Central",
      websiteUrl: "https://padariacentral.com.br/",
    });

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/v1/places/ChIJabc123");
    expect((init.headers as Record<string, string>)["X-Goog-FieldMask"]).toContain("displayName");
    expect((init.headers as Record<string, string>)["X-Goog-FieldMask"]).not.toContain("places.");
  });

  it("returns empty page when provider finds nothing", async () => {
    const provider = createGooglePlacesProvider({
      apiKey: "k",
      fetchFn: fetchResponding(200, {}),
    });

    const page = await provider.search({ city: "Fortaleza", segment: "padarias" });

    expect(page.businesses).toEqual([]);
    expect(page.nextPageToken).toBeNull();
  });

  it.each([
    [429, { error: { status: "RESOURCE_EXHAUSTED", message: "Quota" } }, "QUOTA_EXCEEDED"],
    [400, { error: { status: "INVALID_ARGUMENT", message: "Bad location" } }, "INVALID_LOCATION"],
    [404, { error: { status: "NOT_FOUND", message: "Gone" } }, "NOT_FOUND"],
    [500, { error: { status: "INTERNAL", message: "boom" } }, "PROVIDER_ERROR"],
  ] as const)("maps HTTP %s to %s", async (status, body, code) => {
    const provider = createGooglePlacesProvider({
      apiKey: "k",
      fetchFn: fetchResponding(status, body),
    });

    const error = await provider.search({ city: "X", segment: "y" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DiscoveryError);
    expect((error as DiscoveryError).code).toBe(code);
  });

  it("wraps network failures as PROVIDER_ERROR", async () => {
    const provider = createGooglePlacesProvider({
      apiKey: "k",
      fetchFn: vi.fn(async () => {
        throw new Error("ECONNRESET");
      }),
    });

    const error = await provider.search({ city: "X", segment: "y" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DiscoveryError);
    expect((error as DiscoveryError).code).toBe("PROVIDER_ERROR");
  });

  it("rejects malformed success payloads", async () => {
    const provider = createGooglePlacesProvider({
      apiKey: "k",
      fetchFn: fetchResponding(200, { places: [{ id: "" }] }),
    });

    const error = await provider.search({ city: "X", segment: "y" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DiscoveryError);
    expect((error as DiscoveryError).code).toBe("PROVIDER_ERROR");
  });
});
