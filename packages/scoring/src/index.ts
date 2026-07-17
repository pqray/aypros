export type OpportunityLevel = "low" | "medium" | "high" | "very_high";
export type ConfidenceLevel = "low" | "medium" | "high";
export type DetectionState = "detected" | "not_detected" | "inconclusive";
export type BusinessSegment = "restaurant" | "food_service" | "services" | "retail" | "other";

export type ScoreBusinessInput = {
  websiteUrl: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  raw?: {
    socialOnly?: boolean;
    segment?: BusinessSegment;
  };
};

export type ScoreAuditInput = {
  status: "completed" | "failed";
  errorCode?: string | null;
  isHttps: boolean | null;
  detections: {
    siteDown?: DetectionState;
    sslError?: DetectionState;
    hasViewport?: DetectionState;
    hasTitle?: DetectionState;
    hasDescription?: DetectionState;
    outdated?: DetectionState;
    basicBuilder?: DetectionState;
    linkInBio?: DetectionState;
    deliveryPlatform?: DetectionState;
    menuOnline?: DetectionState;
  };
} | null;

export type ScoreReason = {
  code: string;
  label: string;
  impact: number;
};

export type OpportunityScoreResult = {
  score: number;
  level: OpportunityLevel;
  confidence: ConfidenceLevel;
  reasons: ScoreReason[];
  suggestedServices: string[];
  algorithmVersion: "v1" | "v2";
};

const SERVICES_BY_REASON: Record<string, string[]> = {
  no_site: ["Criacao de site"],
  social_only: ["Criacao de site"],
  site_down: ["Manutencao de site", "Reformulacao"],
  no_https: ["Seguranca e HTTPS"],
  no_viewport: ["Site responsivo"],
  outdated: ["Reformulacao"],
  weak_metadata: ["SEO local"],
  basic_builder: ["Reformulacao"],
  link_in_bio_only: ["Criacao de site", "Presenca digital propria"],
  delivery_dependency: ["Criacao de site", "Cardapio online"],
  no_menu_online: ["Cardapio online", "SEO local"],
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

export function levelForScore(score: number): OpportunityLevel {
  if (score >= 80) return "very_high";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function isDetected(value: DetectionState | undefined): boolean {
  return value === "detected";
}

function isNotDetected(value: DetectionState | undefined): boolean {
  return value === "not_detected";
}

function hasInconclusive(audit: ScoreAuditInput): boolean {
  if (!audit) return false;
  if (audit.status === "failed") return true;
  return Object.values(audit.detections).some((value) => value === "inconclusive");
}

function addReason(reasons: ScoreReason[], code: string, label: string, impact: number) {
  reasons.push({ code, label, impact });
}

function uniqueServices(reasons: ScoreReason[]): string[] {
  return Array.from(new Set(reasons.flatMap((reason) => SERVICES_BY_REASON[reason.code] ?? [])));
}

export function calculateOpportunityScore(
  business: ScoreBusinessInput,
  audit: ScoreAuditInput,
): OpportunityScoreResult {
  const reasons: ScoreReason[] = [];
  const socialOnly = business.raw?.socialOnly === true;
  const segment = business.raw?.segment ?? "other";
  const foodSegment = segment === "restaurant" || segment === "food_service";
  const hasWebsite = Boolean(business.websiteUrl?.trim());

  if (!hasWebsite && !socialOnly) {
    addReason(reasons, "no_site", "Nao possui site proprio", 40);
  } else if (socialOnly) {
    addReason(reasons, "social_only", "Site e apenas rede social", 35);
  }

  if (audit?.status === "completed") {
    if (isDetected(audit.detections.siteDown) || isDetected(audit.detections.sslError)) {
      addReason(reasons, "site_down", "Site fora do ar ou com erro SSL", 30);
    }
    if (audit.isHttps === false) {
      addReason(reasons, "no_https", "Site sem HTTPS", 15);
    }
    if (isNotDetected(audit.detections.hasViewport)) {
      addReason(reasons, "no_viewport", "Sem meta viewport", 12);
    }
    if (isDetected(audit.detections.outdated)) {
      addReason(reasons, "outdated", "Sinais de site desatualizado", 10);
    }
    if (
      isNotDetected(audit.detections.hasTitle) ||
      isNotDetected(audit.detections.hasDescription)
    ) {
      addReason(reasons, "weak_metadata", "Sem title/description adequados", 8);
    }
    if (isDetected(audit.detections.basicBuilder)) {
      addReason(reasons, "basic_builder", "Builder basico detectado", 6);
    }
    if (isDetected(audit.detections.linkInBio)) {
      addReason(reasons, "link_in_bio_only", "Atende so por link-in-bio", 25);
    }
    if (foodSegment && isDetected(audit.detections.deliveryPlatform)) {
      addReason(
        reasons,
        "delivery_dependency",
        "Depende de plataforma de delivery sem site proprio",
        20,
      );
    }
    if (foodSegment && isNotDetected(audit.detections.menuOnline)) {
      addReason(reasons, "no_menu_online", "Sem cardapio online detectado", 12);
    }
  }

  if ((business.rating ?? 0) >= 4 && (business.reviewCount ?? 0) >= 20) {
    addReason(reasons, "active_business", "Empresa ativa e bem avaliada", 15);
  }
  if (business.phone?.trim()) {
    addReason(reasons, "reachable", "Possui telefone/WhatsApp", 5);
  }
  if ((business.reviewCount ?? -1) === 0) {
    addReason(reasons, "low_activity", "Pouquissima atividade", -10);
  }

  const healthySite =
    audit?.status === "completed" &&
    audit.isHttps === true &&
    isDetected(audit.detections.hasViewport) &&
    isDetected(audit.detections.hasTitle) &&
    isDetected(audit.detections.hasDescription) &&
    !isDetected(audit.detections.siteDown) &&
    !isDetected(audit.detections.sslError);
  if (healthySite) {
    addReason(reasons, "healthy_site", "Site moderno e saudavel", -30);
  }

  const rawScore = reasons.reduce((total, reason) => total + reason.impact, 0);
  const score = clampScore(rawScore);
  const confidence: ConfidenceLevel = audit ? (hasInconclusive(audit) ? "medium" : "high") : "low";

  return {
    score,
    level: levelForScore(score),
    confidence,
    reasons: reasons.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    suggestedServices: uniqueServices(reasons),
    algorithmVersion: "v2",
  };
}
