import type { LeadStage } from "@aypros/types";
import { z } from "zod";
import { LEAD_STAGES } from "@/features/pipeline/board";

export const opportunityLevels = ["low", "medium", "high", "very_high"] as const;
export const searchStatuses = ["pending", "processing", "completed", "partial", "failed"] as const;
export const activityTypes = [
  "search_created",
  "business_created",
  "business_favorited",
  "audit_completed",
  "data_refresh_requested",
  "lead_created",
  "lead_assigned",
  "lead_contacted",
  "lead_stage_changed",
  "lead_archived",
  "note_created",
  "ai_generated",
  "export_created",
] as const;

export type OpportunityLevel = (typeof opportunityLevels)[number];
export type SearchStatus = (typeof searchStatuses)[number];
export type ActivityType = (typeof activityTypes)[number];

const metricsRowSchema = z.object({
  searches_count: z.coerce.number().int().nonnegative(),
  businesses_count: z.coerce.number().int().nonnegative(),
  businesses_without_website_count: z.coerce.number().int().nonnegative(),
  active_leads_count: z.coerce.number().int().nonnegative(),
});

export type DashboardMetrics = {
  searchesCount: number;
  businessesCount: number;
  businessesWithoutWebsiteCount: number;
  activeLeadsCount: number;
};

export function parseDashboardMetrics(input: unknown): DashboardMetrics {
  const row = metricsRowSchema.parse(input);
  return {
    searchesCount: row.searches_count,
    businessesCount: row.businesses_count,
    businessesWithoutWebsiteCount: row.businesses_without_website_count,
    activeLeadsCount: row.active_leads_count,
  };
}

const opportunityRowSchema = z.object({
  business_id: z.string().min(1),
  business_name: z.string().min(1),
  city: z.string().nullable(),
  state: z.string().nullable(),
  score: z.coerce.number().int().min(0).max(100),
  level: z.enum(opportunityLevels),
  main_reason: z.string().nullable(),
});

export type DashboardOpportunity = {
  businessId: string;
  businessName: string;
  city: string | null;
  state: string | null;
  score: number;
  level: OpportunityLevel;
  mainReason: string | null;
};

export function parseDashboardOpportunities(input: unknown): DashboardOpportunity[] {
  return z
    .array(opportunityRowSchema)
    .parse(input)
    .map((row) => ({
      businessId: row.business_id,
      businessName: row.business_name,
      city: row.city,
      state: row.state,
      score: row.score,
      level: row.level,
      mainReason: row.main_reason,
    }));
}

const searchRowSchema = z.object({
  id: z.string().min(1),
  city: z.string(),
  state: z.string(),
  segment: z.string(),
  status: z.enum(searchStatuses),
  total_found: z.coerce.number().int().nonnegative(),
  created_at: z.string(),
});

export type DashboardSearch = {
  id: string;
  city: string;
  state: string;
  segment: string;
  status: SearchStatus;
  totalFound: number;
  createdAt: string;
};

export function parseDashboardSearches(input: unknown): DashboardSearch[] {
  return z
    .array(searchRowSchema)
    .parse(input)
    .map((row) => ({
      id: row.id,
      city: row.city,
      state: row.state,
      segment: row.segment,
      status: row.status,
      totalFound: row.total_found,
      createdAt: row.created_at,
    }));
}

const activityRowSchema = z.object({
  id: z.string().min(1),
  type: z.enum(activityTypes),
  payload: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
});

export type DashboardActivity = {
  id: string;
  type: ActivityType;
  payload: Record<string, unknown>;
  createdAt: string;
};

const pipelineDistributionRowSchema = z.object({
  stage: z.enum(LEAD_STAGES as [LeadStage, ...LeadStage[]]),
  count: z.coerce.number().int().nonnegative(),
});

export type DashboardPipelineDistribution = {
  stage: LeadStage;
  count: number;
};

export function parseDashboardPipelineDistribution(input: unknown): DashboardPipelineDistribution[] {
  return z
    .array(pipelineDistributionRowSchema)
    .parse(input)
    .map((row) => ({ stage: row.stage, count: row.count }));
}

export function parseDashboardActivities(input: unknown): DashboardActivity[] {
  return z
    .array(activityRowSchema)
    .parse(input)
    .map((row) => ({
      id: row.id,
      type: row.type,
      payload: row.payload,
      createdAt: row.created_at,
    }));
}
