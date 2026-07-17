import { lookup } from "node:dns/promises";
import net from "node:net";
import { AuditError } from "./types";
import { normalizeAuditUrl } from "./url";

export type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

export type DnsResolver = (hostname: string) => Promise<ResolvedAddress[]>;

const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain"]);

export const defaultDnsResolver: DnsResolver = async (hostname) => {
  const result = await lookup(hostname, { all: true, verbatim: true });
  return result.map((entry) => ({ address: entry.address, family: entry.family as 4 | 6 }));
};

function parseIpv4(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const bytes = parts.map((part) => Number(part));
  if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) return null;
  return bytes;
}

function isBlockedIpv4(address: string): boolean {
  const bytes = parseIpv4(address);
  if (!bytes) return false;
  const a = bytes[0] as number;
  const b = bytes[1] as number;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function expandIpv6(address: string): string {
  return address.toLowerCase();
}

function isBlockedIpv6(address: string): boolean {
  const value = expandIpv6(address);
  if (value === "::1" || value === "::") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  ) {
    return true;
  }
  if (value.startsWith("ff")) return true;
  return false;
}

export function isBlockedIp(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isBlockedIpv4(address);
  if (family === 6) return isBlockedIpv6(address);
  return false;
}

export async function assertSafeUrl(
  input: string | URL,
  resolver: DnsResolver = defaultDnsResolver,
): Promise<URL> {
  const url = typeof input === "string" ? normalizeAuditUrl(input) : input;
  const hostname = url.hostname.toLowerCase();

  if (BLOCKED_HOSTS.has(hostname)) {
    throw new AuditError("SSRF_BLOCKED", "Host bloqueado");
  }

  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new AuditError("SSRF_BLOCKED", "IP bloqueado");
    }
    return url;
  }

  const addresses = await resolver(hostname);
  if (addresses.length === 0 || addresses.some((entry) => isBlockedIp(entry.address))) {
    throw new AuditError("SSRF_BLOCKED", "DNS resolve para IP bloqueado");
  }
  return url;
}
