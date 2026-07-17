import { AuditError } from "./types";

export function normalizeAuditUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new AuditError("INVALID_URL", "URL vazia");
  }

  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new AuditError("INVALID_URL", "URL invalida");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AuditError("INVALID_URL", "Esquema não permitido");
  }
  url.hostname = url.hostname.toLowerCase();
  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }
  return url;
}
