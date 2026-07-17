import * as cheerio from "cheerio";
import type { AuditDetection } from "./types";

type PlatformKind = "link_in_bio" | "delivery_platform";

type PlatformDefinition = {
  id: string;
  kind: PlatformKind;
  label: string;
  domains: string[];
  htmlSignatures: string[];
};

export const SEGMENT_PLATFORM_DEFINITIONS: PlatformDefinition[] = [
  {
    id: "linktree",
    kind: "link_in_bio",
    label: "Linktree",
    domains: ["linktr.ee", "linktree.com"],
    htmlSignatures: ["linktree"],
  },
  {
    id: "lnk_bio",
    kind: "link_in_bio",
    label: "lnk.bio",
    domains: ["lnk.bio"],
    htmlSignatures: ["lnk.bio"],
  },
  {
    id: "beacons",
    kind: "link_in_bio",
    label: "Beacons",
    domains: ["beacons.ai"],
    htmlSignatures: ["beacons.ai", "beacons"],
  },
  {
    id: "ifood",
    kind: "delivery_platform",
    label: "iFood",
    domains: ["ifood.com.br"],
    htmlSignatures: ["ifood"],
  },
  {
    id: "goomer",
    kind: "delivery_platform",
    label: "Goomer",
    domains: ["goomer.app", "goomer.com.br"],
    htmlSignatures: ["goomer"],
  },
  {
    id: "anota_ai",
    kind: "delivery_platform",
    label: "Anota AI",
    domains: ["anota.ai", "anotaai.com"],
    htmlSignatures: ["anota ai", "anota.ai", "anotaai"],
  },
  {
    id: "cardapio_web",
    kind: "delivery_platform",
    label: "Cardápio Web",
    domains: ["cardapioweb.com"],
    htmlSignatures: ["cardapio web", "cardapioweb"],
  },
  {
    id: "menu_dino",
    kind: "delivery_platform",
    label: "Menu Dino",
    domains: ["menudino.com"],
    htmlSignatures: ["menu dino", "menudino"],
  },
];

function detected(evidence?: Record<string, unknown>): AuditDetection {
  return { state: "detected", evidence };
}

function notDetected(evidence?: Record<string, unknown>): AuditDetection {
  return { state: "not_detected", evidence };
}

function normalizeUrl(url: string, baseUrl: string): URL | null {
  try {
    return new URL(url, baseUrl);
  } catch {
    return null;
  }
}

function domainMatches(hostname: string, domains: string[]): boolean {
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function excerpt(haystack: string, needle: string): string {
  const index = haystack.indexOf(needle);
  if (index < 0) return needle;
  return haystack.slice(Math.max(0, index - 40), index + needle.length + 40).replace(/\s+/g, " ");
}

function findPlatform(kind: PlatformKind, input: { finalUrl: string; links: string[]; html: string }) {
  const html = input.html.toLowerCase();
  const urls = [input.finalUrl, ...input.links];
  for (const definition of SEGMENT_PLATFORM_DEFINITIONS.filter((item) => item.kind === kind)) {
    for (const candidate of urls) {
      const url = normalizeUrl(candidate, input.finalUrl);
      if (url && domainMatches(url.hostname.toLowerCase(), definition.domains)) {
        return {
          id: definition.id,
          label: definition.label,
          url: url.href,
          source: candidate === input.finalUrl ? "final_url" : "link",
        };
      }
    }

    const signature = definition.htmlSignatures.find((item) => html.includes(item));
    if (signature) {
      return {
        id: definition.id,
        label: definition.label,
        signature,
        excerpt: excerpt(html, signature),
        source: "html",
      };
    }
  }
  return null;
}

function hasMenuOnline($: cheerio.CheerioAPI, finalUrl: string): AuditDetection {
  const menuLink = $("a[href]")
    .map((_, el) => {
      const href = $(el).attr("href") ?? "";
      const text = $(el).text().trim();
      return { href, text };
    })
    .get()
    .find((link) => {
      const combined = `${link.href} ${link.text}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return /\b(cardapio|menu|pedido|pedir|delivery)\b/.test(combined);
    });

  if (!menuLink) return notDetected();
  return detected({
    href: normalizeUrl(menuLink.href, finalUrl)?.href ?? menuLink.href,
    text: menuLink.text.slice(0, 80),
  });
}

export function detectSegmentPlatforms(input: {
  $: cheerio.CheerioAPI;
  html: string;
  finalUrl: string;
  links: string[];
}): {
  linkInBio: AuditDetection;
  deliveryPlatform: AuditDetection;
  menuOnline: AuditDetection;
} {
  const linkInBio = findPlatform("link_in_bio", input);
  const deliveryPlatform = findPlatform("delivery_platform", input);
  return {
    linkInBio: linkInBio ? detected(linkInBio) : notDetected(),
    deliveryPlatform: deliveryPlatform ? detected(deliveryPlatform) : notDetected(),
    menuOnline: hasMenuOnline(input.$, input.finalUrl),
  };
}
