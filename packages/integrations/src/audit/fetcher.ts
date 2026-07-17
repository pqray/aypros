import { AuditError, type AuditResult } from "./types";
import { parseHtmlAudit } from "./parser";
import { assertSafeUrl, type DnsResolver } from "./ssrf";
import { normalizeAuditUrl } from "./url";

export type AuditFetch = typeof fetch;

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const USER_AGENT = "AyprosAuditBot/1.0 (+https://aypros.local)";

function headersToRecord(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key.toLowerCase()] = value;
  });
  return output;
}

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_BYTES) {
        throw new AuditError("TOO_LARGE", "Resposta excedeu o limite");
      }
      chunks.push(value);
    }
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

function completedResult(
  partial: Omit<AuditResult, "status" | "errorCode">,
  errorCode: string | null = null,
): AuditResult {
  return { ...partial, status: "completed", errorCode };
}

function unavailableResult(params: {
  finalUrl: string;
  responseTimeMs: number;
  redirectCount: number;
  errorCode: string;
  message: string;
}): AuditResult {
  const parsed = parseHtmlAudit({ html: "", finalUrl: params.finalUrl, status: 0, headers: {} });
  return completedResult(
    {
      finalUrl: params.finalUrl,
      httpStatus: null,
      responseTimeMs: params.responseTimeMs,
      redirectCount: params.redirectCount,
      isHttps: params.finalUrl.startsWith("https://"),
      htmlSizeBytes: 0,
      detections: {
        ...parsed.detections,
        siteDown: {
          state: "detected",
          evidence: { code: params.errorCode, message: params.message },
        },
      },
      evidence: { error: params.message },
    },
    params.errorCode,
  );
}

export async function auditWebsite(input: {
  url: string;
  fetchImpl?: AuditFetch;
  resolver?: DnsResolver;
  timeoutMs?: number;
}): Promise<AuditResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const resolver = input.resolver;
  const timeoutMs = input.timeoutMs ?? 10_000;
  const startedAt = Date.now();
  let current = normalizeAuditUrl(input.url);
  let redirectCount = 0;

  while (true) {
    current = await assertSafeUrl(current, resolver);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
    } catch (error) {
      const code =
        error instanceof DOMException && error.name === "AbortError" ? "TIMEOUT" : "FETCH_FAILED";
      if (code === "TIMEOUT") {
        throw new AuditError(code, "Timeout ao buscar site");
      }
      return unavailableResult({
        finalUrl: current.toString(),
        responseTimeMs: Date.now() - startedAt,
        redirectCount,
        errorCode: code,
        message: error instanceof Error ? error.message : "Falha ao buscar site",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      redirectCount += 1;
      if (redirectCount > MAX_REDIRECTS) {
        throw new AuditError("TOO_MANY_REDIRECTS", "Redirecionamentos em excesso");
      }
      current = new URL(response.headers.get("location") as string, current);
      continue;
    }

    const headers = headersToRecord(response.headers);
    const contentType = response.headers.get("content-type") ?? "";
    const responseTimeMs = Date.now() - startedAt;
    const base = {
      finalUrl: current.toString(),
      httpStatus: response.status,
      responseTimeMs,
      redirectCount,
      isHttps: current.protocol === "https:",
      htmlSizeBytes: 0,
      detections: parseHtmlAudit({
        html: "",
        finalUrl: current.toString(),
        status: response.status,
        headers,
      }).detections,
      evidence: { headers },
    };

    if (!contentType.toLowerCase().includes("text/html")) {
      return completedResult(
        {
          ...base,
          detections: {
            ...base.detections,
            nonHtml: { state: "detected", evidence: { contentType } },
          },
          evidence: { ...base.evidence, contentType },
        },
        "NON_HTML",
      );
    }

    const html = await readLimited(response);
    const parsed = parseHtmlAudit({
      html,
      finalUrl: current.toString(),
      status: response.status,
      headers,
    });
    return completedResult({
      ...base,
      htmlSizeBytes: Buffer.byteLength(html),
      detections: parsed.detections,
      evidence: { ...parsed.evidence, headers },
    });
  }
}
