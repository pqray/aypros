// Pure normalization helpers (specs/08). No I/O.

const SOCIAL_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "m.facebook.com",
  "linktr.ee",
  "beacons.ai",
  "bio.link",
  "wa.me",
  "api.whatsapp.com",
  "whatsapp.com",
  "t.me",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "kwai.com",
];

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Best-effort E.164 for Brazilian numbers. Landlines (10 digits) and mobiles
 * (11 digits) become +55...; already-international input keeps its digits.
 * Anything ambiguous returns null instead of guessing.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 0) {
    return null;
  }

  if (trimmed.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  if (digits.length === 12 || digits.length === 13) {
    // 55 + DDD + number already included.
    return digits.startsWith("55") ? `+${digits}` : null;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return null;
}

export type NormalizedWebsite = {
  /** Cleaned own-website URL, or null when absent/social-only. */
  websiteUrl: string | null;
  /** True when the URL points to a social profile instead of an own website. */
  socialOnly: boolean;
};

function isSocialHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return SOCIAL_HOSTS.some((social) => host === social || host.endsWith(`.${social}`));
}

/**
 * Absolute http(s) URL with tracking params and fragment removed. A URL on a
 * social platform counts as "no own website" (social_only) for scoring.
 */
export function normalizeWebsite(input: string | null | undefined): NormalizedWebsite {
  if (!input || input.trim().length === 0) {
    return { websiteUrl: null, socialOnly: false };
  }

  const candidate = input.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { websiteUrl: null, socialOnly: false };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { websiteUrl: null, socialOnly: false };
  }

  if (isSocialHost(url.hostname)) {
    return { websiteUrl: null, socialOnly: true };
  }

  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|igsh)/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  url.hash = "";

  return { websiteUrl: url.toString(), socialOnly: false };
}
