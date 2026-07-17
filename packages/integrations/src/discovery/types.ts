export type DiscoverySearchParams = {
  city: string;
  state?: string;
  country?: string;
  segment: string;
  pageToken?: string;
  limit?: number;
};

export type DiscoveredBusiness = {
  provider: string;
  providerPlaceId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  /** E.164 when possible, otherwise null. */
  phone: string | null;
  /** Cleaned own-website URL; null when absent or when the "site" is a social profile. */
  websiteUrl: string | null;
  /** True when the provider website points to a social profile (Instagram, Linktree, ...). */
  socialOnly: boolean;
  /** Host family when `socialOnly` is true, e.g. instagram.com. */
  socialPlatform: string | null;
  rating: number | null;
  reviewCount: number | null;
  categories: string[];
  lat: number | null;
  lng: number | null;
  /** Untouched provider payload, kept for reprocessing. */
  raw: Record<string, unknown>;
};

export type DiscoveryPage = {
  businesses: DiscoveredBusiness[];
  nextPageToken: string | null;
};

export const discoveryErrorCodes = [
  "RATE_LIMITED",
  "QUOTA_EXCEEDED",
  "INVALID_LOCATION",
  "NOT_FOUND",
  "PROVIDER_ERROR",
] as const;

export type DiscoveryErrorCode = (typeof discoveryErrorCodes)[number];

export class DiscoveryError extends Error {
  constructor(
    public readonly code: DiscoveryErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "DiscoveryError";
  }
}

export interface DiscoveryProvider {
  name: string;
  search(params: DiscoverySearchParams): Promise<DiscoveryPage>;
}

export interface PlaceDetailsProvider {
  name: string;
  getDetails(placeId: string): Promise<DiscoveredBusiness>;
}
