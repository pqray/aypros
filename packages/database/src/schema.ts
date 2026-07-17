import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const processStatus = pgEnum("process_status", [
  "pending",
  "processing",
  "completed",
  "partial",
  "failed",
]);
export const memberRole = pgEnum("member_role", ["owner", "admin", "member"]);
export const opportunityLevel = pgEnum("opportunity_level", ["low", "medium", "high", "very_high"]);
export const confidenceLevel = pgEnum("confidence_level", ["low", "medium", "high"]);
export const leadStage = pgEnum("lead_stage", [
  "new",
  "contacted",
  "in_conversation",
  "proposal_sent",
  "won",
  "lost",
]);
export const leadStatus = pgEnum("lead_status", ["active", "won", "lost", "archived"]);
export const activityType = pgEnum("activity_type", [
  "search_created",
  "business_favorited",
  "audit_completed",
  "data_refresh_requested",
  "lead_created",
  "lead_assigned",
  "lead_contacted",
  "lead_stage_changed",
  "note_created",
  "ai_generated",
  "export_created",
]);
export const aiKind = pgEnum("ai_kind", ["commercial_summary", "whatsapp_message", "email_message"]);

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt,
  updatedAt,
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdBy: uuid("created_by").notNull(),
  createdAt,
  updatedAt,
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: memberRole("role").notNull().default("member"),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_members_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const searches = pgTable("searches", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  createdBy: uuid("created_by").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull().default("BR"),
  segment: text("segment").notNull(),
  status: processStatus("status").notNull().default("pending"),
  totalFound: integer("total_found").notNull().default(0),
  errorMessage: text("error_message"),
  provider: text("provider").notNull(),
  createdAt,
  updatedAt,
});

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerPlaceId: text("provider_place_id").notNull(),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    phone: text("phone"),
    websiteUrl: text("website_url"),
    rating: numeric("rating"),
    reviewCount: integer("review_count"),
    categories: text("categories").array().notNull().default([]),
    lat: numeric("lat"),
    lng: numeric("lng"),
    raw: jsonb("raw").notNull().default({}),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
    providerStatus: text("provider_status").notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (table) => [unique().on(table.provider, table.providerPlaceId)],
);

export const searchResults = pgTable(
  "search_results",
  {
    searchId: uuid("search_id").notNull(),
    businessId: uuid("business_id").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.searchId, table.businessId] })],
);

export const favorites = pgTable(
  "favorites",
  {
    organizationId: uuid("organization_id").notNull(),
    businessId: uuid("business_id").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt,
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.businessId] })],
);

export const savedFilters = pgTable("saved_filters", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  createdBy: uuid("created_by").notNull(),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull().default({}),
  createdAt,
  updatedAt,
});

export const websiteAudits = pgTable("website_audits", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  requestedBy: uuid("requested_by").notNull(),
  status: processStatus("status").notNull().default("pending"),
  finalUrl: text("final_url"),
  httpStatus: integer("http_status"),
  responseTimeMs: integer("response_time_ms"),
  redirectCount: integer("redirect_count"),
  isHttps: boolean("is_https"),
  detections: jsonb("detections").notNull().default({}),
  evidence: jsonb("evidence").notNull().default({}),
  errorCode: text("error_code"),
  createdAt,
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const opportunityScores = pgTable("opportunity_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull(),
  auditId: uuid("audit_id"),
  score: integer("score").notNull(),
  level: opportunityLevel("level").notNull(),
  confidence: confidenceLevel("confidence").notNull(),
  reasons: jsonb("reasons").notNull().default([]),
  suggestedServices: jsonb("suggested_services").notNull().default([]),
  algorithmVersion: text("algorithm_version").notNull(),
  createdAt,
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    businessId: uuid("business_id").notNull(),
    stage: leadStage("stage").notNull().default("new"),
    status: leadStatus("status").notNull().default("active"),
    potentialValue: numeric("potential_value"),
    nextAction: text("next_action"),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    assignedTo: uuid("assigned_to"),
    position: integer("position").notNull().default(0),
    createdBy: uuid("created_by").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique().on(table.organizationId, table.businessId),
    index("leads_org_assigned_to_idx").on(table.organizationId, table.assignedTo),
  ],
);

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  authorId: uuid("author_id").notNull(),
  content: text("content").notNull(),
  createdAt,
  updatedAt,
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  leadId: uuid("lead_id"),
  businessId: uuid("business_id"),
  actorId: uuid("actor_id"),
  type: activityType("type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt,
});

export const aiGenerations = pgTable("ai_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull(),
  businessId: uuid("business_id").notNull(),
  requestedBy: uuid("requested_by").notNull(),
  kind: aiKind("kind").notNull(),
  promptVersion: text("prompt_version").notNull(),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  model: text("model").notNull(),
  tokensUsed: integer("tokens_used"),
  status: processStatus("status").notNull().default("pending"),
  createdAt,
});

export const businessAiBriefings = pgTable(
  "business_ai_briefings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    businessId: uuid("business_id").notNull(),
    kind: text("kind").notNull().default("commercial_briefing"),
    contentJson: jsonb("content_json").notNull(),
    summary: text("summary").notNull(),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    sourceHash: text("source_hash").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("business_ai_briefings_org_business_kind_created_idx").on(
      table.organizationId,
      table.businessId,
      table.kind,
      table.createdAt,
    ),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
