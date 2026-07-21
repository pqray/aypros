export type AiKind = "commercial_summary" | "whatsapp_message" | "email_message" | "cost_estimate";

export type AiDetectionState = "detected" | "not_detected" | "inconclusive";
export type AiBusinessSegment = "restaurant" | "food_service" | "services" | "retail" | "other";

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
    socialOnly: boolean;
    socialPlatform: string | null;
    segment: AiBusinessSegment;
  };
  audit: {
    status: string;
    isHttps: boolean | null;
    responseTimeMs: number | null;
    findings: Array<{ code: string; state: AiDetectionState }>;
    platforms: Array<{ code: string; state: AiDetectionState; evidence?: Record<string, unknown> }>;
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

/** Análise consultiva estruturada (prompt summary-v2, fase 17). */
export type CommercialSummaryV2Output = {
  context: string;
  digitalPresence: string;
  strongSignals: string[];
  weakSignals: string[];
  gaps: string[];
  channelDependence: string | null;
  commercialImpact: string;
  recommendedOffer: string;
  salesAngle: string;
  expectedObjections: string[];
  nextStep: string;
};

export type WhatsappMessageOutput = {
  message: string;
};

export type EmailMessageOutput = {
  subject: string;
  body: string;
};

export type CostEstimateOutput = {
  domainCostAnnual: number;
  hostingCostMonthly: number;
  marginTargetPercent: number;
  rationale: string;
};

export type BusinessBriefingInput = AiInput & {
  report: {
    summary: string;
    findings: Array<{ title: string; body: string; impact: string; status: "problem" | "ok" | "unknown" }>;
    recommendations: Array<{ priority: "alta" | "media"; text: string }>;
    nextSteps: string[];
    httpStatusNote: string | null;
  } | null;
  pipeline: {
    leadId: string;
    stage: string;
    status: string;
    assignedToName: string | null;
    lastContactAt: string | null;
    nextAction: string | null;
    nextActionAt: string | null;
    notes: string[];
  } | null;
};

export type BusinessBriefingOutput = {
  context: string;
  digitalPresence: string;
  opportunities: string[];
  risks: string[];
  salesAngle: string;
  recommendedOffer: string;
  nextStep: string;
  confidenceNotes: string[];
};

export type ContactCopilotChannel = "whatsapp" | "email" | "phone" | "other";
export type ContactCopilotStage = "new" | "contacted" | "in_conversation" | "proposal_sent" | "won" | "lost";
export type ContactCopilotStatus = "active" | "won" | "lost" | "archived";

/** Input do Copiloto de contato (fase 19) — AiInput + a conversa livre do vendedor. */
export type ContactCopilotInput = AiInput & {
  channel: ContactCopilotChannel;
  transcript: string;
  recentNotes: string[];
};

export type ContactCopilotOutput = {
  summary: string;
  customerPosition: string;
  objections: string[];
  positiveSignals: string[];
  risks: string[];
  recommendedReply: string;
  recommendedNextAction: {
    label: string;
    dueInDays: number;
    reason: string;
  };
  suggestedLeadPatch: {
    stage: ContactCopilotStage | null;
    status: ContactCopilotStatus | null;
    potentialValue: number | null;
  };
  noteDraft: string;
  confidenceNotes: string[];
};

export type ContactCopilotResult = {
  output: ContactCopilotOutput;
  model: string;
  tokensUsed: number | null;
  promptVersion: string;
};

export type AiOutput =
  | CommercialSummaryOutput
  | CommercialSummaryV2Output
  | WhatsappMessageOutput
  | EmailMessageOutput
  | CostEstimateOutput;

export type BusinessBriefingResult = {
  output: BusinessBriefingOutput;
  model: string;
  tokensUsed: number | null;
  promptVersion: string;
};

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
