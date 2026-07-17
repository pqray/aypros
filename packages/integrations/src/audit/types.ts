export type DetectionState = "detected" | "not_detected" | "inconclusive";

export type AuditDetection = {
  state: DetectionState;
  evidence?: Record<string, unknown>;
};

export type AuditDetections = {
  siteDown: AuditDetection;
  sslError: AuditDetection;
  hasTitle: AuditDetection;
  hasDescription: AuditDetection;
  hasFavicon: AuditDetection;
  hasOpenGraph: AuditDetection;
  hasLang: AuditDetection;
  hasViewport: AuditDetection;
  platform: AuditDetection;
  socialLinks: AuditDetection;
  whatsapp: AuditDetection;
  outdated: AuditDetection;
  basicBuilder: AuditDetection;
  nonHtml: AuditDetection;
};

export type AuditResult = {
  status: "completed" | "failed";
  finalUrl: string | null;
  httpStatus: number | null;
  responseTimeMs: number | null;
  redirectCount: number;
  isHttps: boolean | null;
  htmlSizeBytes: number;
  detections: AuditDetections;
  evidence: Record<string, unknown>;
  errorCode: string | null;
};

export class AuditError extends Error {
  constructor(
    public readonly code:
      | "INVALID_URL"
      | "SSRF_BLOCKED"
      | "TIMEOUT"
      | "TOO_LARGE"
      | "TOO_MANY_REDIRECTS"
      | "FETCH_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "AuditError";
  }
}
