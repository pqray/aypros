export type OrganizationRole = "owner" | "admin" | "member";

export type AppContextRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  onboarding_completed_at: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_slug: string | null;
  organization_role: OrganizationRole | null;
};

export type LoadedAppContext = {
  user: { id: string; email: string | null };
  profile: { full_name: string | null; onboarding_completed_at: string | null };
  organization: {
    id: string;
    name: string;
    slug: string;
    role: OrganizationRole;
  } | null;
};

export type ProcessStatus = "pending" | "processing" | "completed" | "partial" | "failed";
export type SearchStatus = ProcessStatus;

export type SearchSummary = {
  id: string;
  city: string;
  state: string;
  segment: string;
  status: SearchStatus;
  totalFound: number;
  errorMessage: string | null;
  provider: string;
  createdAt: string;
};

export type CreateSearchResponse = {
  search: SearchSummary;
  reused: boolean;
};

export type SearchListResponse = {
  items: SearchSummary[];
  page: number;
  pageSize: number;
  total: number;
};

export type SearchResultItem = {
  businessId: string;
  position: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  categories: string[];
  favorited: boolean;
};

export type SearchResultsResponse = {
  items: SearchResultItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type ApiErrorBody = {
  error: string;
  code?: string;
  retryAfterSeconds?: number;
};

export type OpportunityLevel = "low" | "medium" | "high" | "very_high";
export type ConfidenceLevel = "low" | "medium" | "high";
export type DetectionState = "detected" | "not_detected" | "inconclusive";
export type BusinessSegment = "restaurant" | "food_service" | "services" | "retail" | "other";

export type BusinessDetail = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  websiteUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  categories: string[];
  segment: BusinessSegment;
};

export type WebsiteAuditSummary = {
  id: string;
  status: SearchStatus;
  finalUrl: string | null;
  httpStatus: number | null;
  responseTimeMs: number | null;
  redirectCount: number | null;
  isHttps: boolean | null;
  detections: Record<string, { state?: DetectionState; evidence?: Record<string, unknown> }>;
  evidence: Record<string, unknown>;
  errorCode: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type OpportunityScoreSummary = {
  id: string;
  auditId: string | null;
  score: number;
  level: OpportunityLevel;
  confidence: ConfidenceLevel;
  reasons: Array<{ code: string; label: string; impact: number }>;
  suggestedServices: string[];
  algorithmVersion: string;
  createdAt: string;
};

export type BusinessAuditSummaryResponse = {
  business: BusinessDetail;
  latestAudit: WebsiteAuditSummary | null;
  latestScore: OpportunityScoreSummary | null;
  refreshedAt: string | null;
  providerStatus: "active" | "removed" | "error";
  favorited: boolean;
  leadId: string | null;
};

export type BusinessRefreshResponse = {
  businessId: string;
  refreshedAt: string | null;
  providerStatus: "active" | "removed" | "error";
  placesRefreshed: boolean;
  auditRefreshed: boolean;
  scoreRecalculated: boolean;
};

export type BusinessListItem = {
  businessId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  websiteUrl: string | null;
  socialOnly: boolean;
  rating: number | null;
  reviewCount: number | null;
  categories: string[];
  segment: BusinessSegment;
  linkInBio: boolean;
  deliveryPlatform: boolean;
  menuOnline: boolean;
  score: number | null;
  scoreLevel: OpportunityLevel | null;
  audited: boolean;
  siteDown: boolean;
  favorited: boolean;
  leadId: string | null;
};

export type BusinessWebsiteFilter = "all" | "with_site" | "without_site";
export type BusinessSegmentFilter = "all" | BusinessSegment;
export type BusinessSortBy = "name" | "score" | "rating";
export type BusinessSortDir = "asc" | "desc";

export type BusinessListQuery = {
  page?: number;
  pageSize?: number;
  websiteFilter?: BusinessWebsiteFilter;
  segment?: BusinessSegmentFilter;
  city?: string;
  minScore?: number;
  maxScore?: number;
  minRating?: number;
  audited?: boolean;
  inPipeline?: boolean;
  favoritesOnly?: boolean;
  search?: string;
  sortBy?: BusinessSortBy;
  sortDir?: BusinessSortDir;
};

export type BusinessListResponse = {
  items: BusinessListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type SavedFilter = {
  id: string;
  name: string;
  filters: BusinessListQuery;
  createdAt: string;
};

export type SavedFilterListResponse = {
  items: SavedFilter[];
};

export type FavoriteToggleResponse = {
  businessId: string;
  favorited: boolean;
};

export type BatchActionResult = {
  businessId: string;
  ok: boolean;
  error?: string;
};

export type BatchFavoriteResponse = {
  results: BatchActionResult[];
};

export type BatchAuditResponse = {
  results: BatchActionResult[];
};

export type LeadStage = "new" | "contacted" | "in_conversation" | "proposal_sent" | "won" | "lost";
export type LeadStatus = "active" | "won" | "lost" | "archived";
export type ContactChannel = "whatsapp" | "email" | "phone" | "other";

export type LeadSummary = {
  id: string;
  businessId: string;
  businessName: string;
  city: string | null;
  state: string | null;
  websiteUrl: string | null;
  stage: LeadStage;
  status: LeadStatus;
  potentialValue: number | null;
  nextAction: string | null;
  nextActionAt: string | null;
  lastContactAt: string | null;
  position: number;
  score: number | null;
  scoreLevel: OpportunityLevel | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedToAvatarUrl: string | null;
  createdAt: string;
};

export type PipelineResponse = {
  items: LeadSummary[];
};

export type OrganizationMemberSummary = {
  userId: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: OrganizationRole;
};

export type OrganizationMembersResponse = {
  items: OrganizationMemberSummary[];
};

export type CreateLeadResponse = {
  lead: LeadSummary;
  created: boolean;
};

export type BatchCreateLeadResponse = {
  results: BatchActionResult[];
};

export type UpdateLeadInput = {
  stage?: LeadStage;
  status?: LeadStatus;
  potentialValue?: number | null;
  nextAction?: string | null;
  nextActionAt?: string | null;
  /** Target index within the destination stage's column; only meaningful together with `stage`. */
  position?: number;
  assignedTo?: string | null;
};

export type CreateLeadContactInput = {
  channel: ContactChannel;
  note?: string;
};

export type LeadContactResponse = {
  lead: LeadSummary;
  activity: LeadActivity;
};

export type LeadNote = {
  id: string;
  leadId: string;
  authorId: string;
  authorName: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadActivity = {
  id: string;
  type: ActivityType;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ActivityType =
  | "search_created"
  | "business_favorited"
  | "audit_completed"
  | "data_refresh_requested"
  | "lead_created"
  | "lead_assigned"
  | "lead_contacted"
  | "lead_stage_changed"
  | "lead_archived"
  | "note_created"
  | "ai_generated"
  | "export_created";

export type LeadDetailResponse = {
  lead: LeadSummary;
  business: BusinessDetail;
  notes: LeadNote[];
  activities: LeadActivity[];
};

export type BusinessReportFindingStatus = "problem" | "ok" | "unknown";

export type BusinessReportFinding = {
  title: string;
  body: string;
  impact: string;
  status: BusinessReportFindingStatus;
};

export type BusinessReportMaturityAxis = {
  label: string;
  /** 0-100; null = não verificado. */
  value: number | null;
};

export type BusinessReportRecommendation = {
  priority: "alta" | "media";
  text: string;
};

/** Modelo do diagnóstico (mesma fonte do PDF), para render na própria UI. */
export type BusinessReportResponse = {
  summary: string;
  score: {
    score: number;
    level: "low" | "medium" | "high" | "very_high";
    confidence: "low" | "medium" | "high";
  } | null;
  httpStatusNote: string | null;
  findings: BusinessReportFinding[];
  maturity: BusinessReportMaturityAxis[];
  recommendations: BusinessReportRecommendation[];
  nextSteps: string[];
  generatedAt: string;
};

export type AiKind = "commercial_summary" | "whatsapp_message" | "email_message";

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

export type AiOutput =
  | CommercialSummaryOutput
  | CommercialSummaryV2Output
  | WhatsappMessageOutput
  | EmailMessageOutput;

export type AiGenerationSummary = {
  id: string;
  kind: AiKind;
  status: ProcessStatus;
  output: AiOutput | null;
  model: string;
  tokensUsed: number | null;
  promptVersion: string;
  createdAt: string;
};

export type AiGenerationsResponse = {
  items: AiGenerationSummary[];
};

export type GenerateAiResponse = {
  generation: AiGenerationSummary;
};
