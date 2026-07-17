import { z } from "zod";
import { normalizePhone, normalizeWebsite, normalizeWhitespace } from "./normalize";
import {
  DiscoveryError,
  type DiscoveredBusiness,
  type DiscoveryPage,
  type DiscoveryProvider,
  type DiscoverySearchParams,
  type PlaceDetailsProvider,
} from "./types";

export const GOOGLE_PLACES_PROVIDER = "google_places";

const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";

const PLACE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "rating",
  "userRatingCount",
  "types",
  "location",
];

const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.types",
  "places.location",
  "nextPageToken",
].join(",");

const DETAILS_FIELD_MASK = PLACE_FIELDS.join(",");

const addressComponentSchema = z.object({
  longText: z.string().optional(),
  shortText: z.string().optional(),
  types: z.array(z.string()).default([]),
});

const placeSchema = z.object({
  id: z.string().min(1),
  displayName: z.object({ text: z.string().min(1) }),
  formattedAddress: z.string().optional(),
  addressComponents: z.array(addressComponentSchema).default([]),
  nationalPhoneNumber: z.string().optional(),
  internationalPhoneNumber: z.string().optional(),
  websiteUri: z.string().optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().int().optional(),
  types: z.array(z.string()).default([]),
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
});

const searchTextResponseSchema = z.object({
  places: z.array(placeSchema).default([]),
  nextPageToken: z.string().optional(),
});

const errorResponseSchema = z.object({
  error: z
    .object({
      status: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

type Place = z.infer<typeof placeSchema>;

function componentText(place: Place, type: string): string | null {
  const component = place.addressComponents.find((entry) => entry.types.includes(type));
  return component?.longText ?? component?.shortText ?? null;
}

function componentShortText(place: Place, type: string): string | null {
  const component = place.addressComponents.find((entry) => entry.types.includes(type));
  return component?.shortText ?? component?.longText ?? null;
}

export function mapPlaceToBusiness(place: Place): DiscoveredBusiness {
  const website = normalizeWebsite(place.websiteUri);
  // In Brazil the municipality usually comes as administrative_area_level_2.
  const city =
    componentText(place, "locality") ?? componentText(place, "administrative_area_level_2");
  const state = componentShortText(place, "administrative_area_level_1");

  return {
    provider: GOOGLE_PLACES_PROVIDER,
    providerPlaceId: place.id,
    name: normalizeWhitespace(place.displayName.text),
    address: place.formattedAddress ? normalizeWhitespace(place.formattedAddress) : null,
    city,
    state,
    phone: normalizePhone(place.internationalPhoneNumber ?? place.nationalPhoneNumber),
    websiteUrl: website.websiteUrl,
    socialOnly: website.socialOnly,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? null,
    categories: place.types,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    raw: place as unknown as Record<string, unknown>,
  };
}

function mapErrorResponse(status: number, body: unknown): DiscoveryError {
  const parsed = errorResponseSchema.safeParse(body);
  const googleStatus = parsed.success ? (parsed.data.error?.status ?? "") : "";
  const message = parsed.success ? parsed.data.error?.message : undefined;

  if (status === 429 || googleStatus === "RESOURCE_EXHAUSTED") {
    return new DiscoveryError("QUOTA_EXCEEDED", message);
  }
  if (status === 400 && googleStatus === "INVALID_ARGUMENT") {
    return new DiscoveryError("INVALID_LOCATION", message);
  }
  if (status === 404 || googleStatus === "NOT_FOUND") {
    return new DiscoveryError("NOT_FOUND", message);
  }
  return new DiscoveryError("PROVIDER_ERROR", message ?? `Google Places HTTP ${status}`);
}

export function createGooglePlacesProvider(options: {
  apiKey: string;
  fetchFn?: typeof fetch;
}): DiscoveryProvider & PlaceDetailsProvider {
  const { apiKey, fetchFn = fetch } = options;

  return {
    name: GOOGLE_PLACES_PROVIDER,

    async search(params: DiscoverySearchParams): Promise<DiscoveryPage> {
      const location = params.state ? `${params.city} - ${params.state}` : params.city;

      let response: Response;
      try {
        response = await fetchFn(SEARCH_TEXT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": SEARCH_FIELD_MASK,
          },
          body: JSON.stringify({
            textQuery: `${params.segment} em ${location}`,
            regionCode: params.country ?? "BR",
            languageCode: "pt-BR",
            pageSize: params.limit ?? 20,
            ...(params.pageToken ? { pageToken: params.pageToken } : {}),
          }),
        });
      } catch (error) {
        throw new DiscoveryError(
          "PROVIDER_ERROR",
          error instanceof Error ? error.message : "Network error",
        );
      }

      const body: unknown = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw mapErrorResponse(response.status, body);
      }

      const parsed = searchTextResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new DiscoveryError("PROVIDER_ERROR", "Unexpected Google Places response shape");
      }

      return {
        businesses: parsed.data.places.map(mapPlaceToBusiness),
        nextPageToken: parsed.data.nextPageToken ?? null,
      };
    },

    async getDetails(placeId: string): Promise<DiscoveredBusiness> {
      let response: Response;
      try {
        response = await fetchFn(`${PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": DETAILS_FIELD_MASK,
          },
        });
      } catch (error) {
        throw new DiscoveryError(
          "PROVIDER_ERROR",
          error instanceof Error ? error.message : "Network error",
        );
      }

      const body: unknown = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw mapErrorResponse(response.status, body);
      }

      const parsed = placeSchema.safeParse(body);
      if (!parsed.success) {
        throw new DiscoveryError("PROVIDER_ERROR", "Unexpected Google Places details shape");
      }

      return mapPlaceToBusiness(parsed.data);
    },
  };
}
