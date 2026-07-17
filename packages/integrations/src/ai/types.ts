export type AiKind = "commercial_summary" | "whatsapp_message" | "email_message";

export type AiDetectionState = "detected" | "not_detected" | "inconclusive";

/**
 * Structured generation input assembled server-side from the database
 * (specs/13). This is the ONLY source of facts the prompts may use —
 * never free-form user text.
 */
export type AiInput = {
  business: {
    name: string;
    city: string | null;
    state: string | null;
    categories: string[];
    rating: number | null;
    reviewCount: number | null;
    hasWebsite: boolean;
    websiteUrl: string | null;
    phone: string | null;
  };
  audit: {
    status: string;
    isHttps: boolean | null;
    responseTimeMs: number | null;
    findings: Array<{ code: string; state: AiDetectionState }>;
  } | null;
  score: {
    score: number;
    level: string;
    confidence: string;
    reasons: Array<{ code: string; label: string; impact: number }>;
    suggestedServices: string[];
  } | null;
  sender: {
    name: string | null;
    organization: string | null;
  };
};

export type CommercialSummaryOutput = {
  summary: string;
  painPoints: string[];
  salesAngle: string;
};

export type WhatsappMessageOutput = {
  message: string;
};

export type EmailMessageOutput = {
  subject: string;
  body: string;
};

export type AiOutput = CommercialSummaryOutput | WhatsappMessageOutput | EmailMessageOutput;

export type AiGenerationResult = {
  output: AiOutput;
  model: string;
  tokensUsed: number | null;
  promptVersion: string;
};

export type AiErrorCode =
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INVALID_OUTPUT"
  | "PROVIDER_ERROR";

export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

export interface AiProvider {
  generate(kind: AiKind, input: AiInput): Promise<AiGenerationResult>;
}
