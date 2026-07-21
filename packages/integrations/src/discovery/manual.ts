import type { DiscoveredBusiness } from "./types";
import { normalizePhone, normalizeWebsite, normalizeWhitespace } from "./normalize";

export const MANUAL_PROVIDER = "manual";

export type ManualBusinessInput = {
  providerPlaceId: string;
  name: string;
  segment: string;
  city?: string;
  state?: string;
  phone?: string;
  websiteUrl?: string;
  instagramUrl?: string;
};

function normalizeHttpUrl(input: string | undefined): string | null {
  if (!input || input.trim().length === 0) {
    return null;
  }

  const candidate = input.trim().replace(/^@/, "https://instagram.com/");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|igsh)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeInstagramUrl(input: string | undefined): string | null {
  const url = normalizeHttpUrl(input);
  if (!url) {
    return null;
  }

  const normalized = normalizeWebsite(url);
  return normalized.socialPlatform === "instagram.com" ? url : null;
}

export function buildManualDiscoveredBusiness(input: ManualBusinessInput): DiscoveredBusiness {
  const ownWebsite = normalizeWebsite(input.websiteUrl);
  const instagramUrl = normalizeInstagramUrl(input.instagramUrl);
  const fallbackSocialWebsite = ownWebsite.socialOnly ? normalizeHttpUrl(input.websiteUrl) : null;
  const socialUrl = instagramUrl ?? fallbackSocialWebsite;
  const socialWebsite = socialUrl ? normalizeWebsite(socialUrl) : null;
  const socialOnly = ownWebsite.websiteUrl ? false : (socialWebsite?.socialOnly ?? ownWebsite.socialOnly);
  const socialPlatform = ownWebsite.websiteUrl
    ? null
    : (socialWebsite?.socialPlatform ?? ownWebsite.socialPlatform);

  return {
    provider: MANUAL_PROVIDER,
    providerPlaceId: input.providerPlaceId,
    name: normalizeWhitespace(input.name),
    address: null,
    city: input.city ? normalizeWhitespace(input.city) : null,
    state: input.state ? normalizeWhitespace(input.state).toUpperCase() : null,
    phone: normalizePhone(input.phone),
    websiteUrl: ownWebsite.websiteUrl,
    socialOnly,
    socialPlatform,
    rating: null,
    reviewCount: null,
    categories: [normalizeWhitespace(input.segment)],
    lat: null,
    lng: null,
    raw: {
      source: MANUAL_PROVIDER,
      segment: "other",
      manualSegment: normalizeWhitespace(input.segment),
      websiteUri: ownWebsite.websiteUrl ?? socialUrl ?? null,
      instagramUrl,
      socialOnly,
      social_only: socialOnly,
      socialPlatform,
      social_platform: socialPlatform,
    },
  };
}
