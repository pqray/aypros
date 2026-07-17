import * as cheerio from "cheerio";
import { detectSegmentPlatforms } from "./segment-platforms";
import type { AuditDetection, AuditDetections } from "./types";

function detected(evidence?: Record<string, unknown>): AuditDetection {
  return { state: "detected", evidence };
}

function notDetected(evidence?: Record<string, unknown>): AuditDetection {
  return { state: "not_detected", evidence };
}

function inconclusive(evidence?: Record<string, unknown>): AuditDetection {
  return { state: "inconclusive", evidence };
}

const SOCIAL_PATTERNS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "tiktok.com",
  "youtube.com",
  "x.com",
  "twitter.com",
];

function isSpaShell($: cheerio.CheerioAPI, html: string): boolean {
  const rootScript = Boolean($("#root").length || $("#__next").length || $("#app").length);
  const scriptCount = $("script[src]").length;
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  return html.length < 4_000 && rootScript && scriptCount > 0 && bodyText.length < 120;
}

function findPlatform($: cheerio.CheerioAPI, html: string, headers: Record<string, string>) {
  const generator = $('meta[name="generator"]').attr("content") ?? "";
  const haystack =
    `${generator} ${html.slice(0, 20_000)} ${Object.values(headers).join(" ")}`.toLowerCase();
  if (haystack.includes("wordpress")) return "wordpress";
  if (haystack.includes("wix")) return "wix";
  if (haystack.includes("squarespace")) return "squarespace";
  if (haystack.includes("shopify")) return "shopify";
  return null;
}

export function parseHtmlAudit(input: {
  html: string;
  finalUrl: string;
  status: number;
  headers?: Record<string, string>;
}): { detections: AuditDetections; evidence: Record<string, unknown> } {
  const headers = input.headers ?? {};
  const $ = cheerio.load(input.html);
  const title = $("title").first().text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const favicon = $('link[rel~="icon"]').attr("href") ?? "";
  const openGraph = $('meta[property^="og:"]').length;
  const lang = $("html").attr("lang")?.trim() ?? "";
  const viewport = $('meta[name="viewport"]').attr("content")?.trim() ?? "";
  const platform = findPlatform($, input.html, headers);
  const links = $("a[href]")
    .map((_, el) => $(el).attr("href") ?? "")
    .get();
  const socialLinks = links.filter((href) =>
    SOCIAL_PATTERNS.some((pattern) => href.toLowerCase().includes(pattern)),
  );
  const instagramLinks = links.filter((href) => href.toLowerCase().includes("instagram.com"));
  const whatsappLinks = links.filter((href) => /wa\.me|whatsapp\.com/i.test(href));
  const segmentPlatforms = detectSegmentPlatforms({ $, html: input.html, finalUrl: input.finalUrl, links });
  const years = Array.from(input.html.matchAll(/\b(19\d{2}|20\d{2})\b/g), (match) =>
    Number(match[1]),
  );
  const currentYear = new Date().getFullYear();
  const oldYears = years.filter((year) => year <= currentYear - 5);
  const spa = isSpaShell($, input.html);
  const contentMissing = spa ? inconclusive({ reason: "spa_shell" }) : notDetected();

  const detections: AuditDetections = {
    siteDown:
      input.status >= 500
        ? detected({ status: input.status })
        : notDetected({ status: input.status }),
    sslError: notDetected(),
    hasTitle: title.length >= 5 ? detected({ title }) : contentMissing,
    hasDescription: description.length >= 20 ? detected({ description }) : contentMissing,
    hasFavicon: favicon ? detected({ href: favicon }) : contentMissing,
    hasOpenGraph: openGraph > 0 ? detected({ count: openGraph }) : contentMissing,
    hasLang: lang ? detected({ lang }) : contentMissing,
    hasViewport: viewport ? detected({ viewport }) : contentMissing,
    platform: platform ? detected({ platform }) : notDetected(),
    socialLinks:
      socialLinks.length > 0 ? detected({ links: socialLinks.slice(0, 5) }) : contentMissing,
    instagram:
      instagramLinks.length > 0
        ? detected({ links: instagramLinks.slice(0, 5) })
        : contentMissing,
    whatsapp:
      whatsappLinks.length > 0 ? detected({ links: whatsappLinks.slice(0, 5) }) : notDetected(),
    outdated: oldYears.length > 0 ? detected({ years: oldYears.slice(0, 5) }) : contentMissing,
    basicBuilder:
      platform === "wix" || platform === "squarespace"
        ? detected({ platform })
        : notDetected({ platform: platform ?? null }),
    linkInBio: segmentPlatforms.linkInBio,
    deliveryPlatform: segmentPlatforms.deliveryPlatform,
    menuOnline: segmentPlatforms.menuOnline,
    nonHtml: notDetected(),
  };

  return {
    detections,
    evidence: {
      finalUrl: input.finalUrl,
      htmlSizeBytes: Buffer.byteLength(input.html),
      spaShell: spa,
    },
  };
}
