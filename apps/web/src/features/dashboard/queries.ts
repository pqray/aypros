import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseDashboardActivities,
  parseDashboardMetrics,
  parseDashboardOpportunities,
  parseDashboardPipelineDistribution,
  parseDashboardSearches,
  type DashboardActivity,
  type DashboardMetrics,
  type DashboardOpportunity,
  type DashboardPipelineDistribution,
  type DashboardSearch,
} from "./schemas";

export type DashboardData = {
  metrics: DashboardMetrics;
  opportunities: DashboardOpportunity[];
  recentSearches: DashboardSearch[];
  recentActivities: DashboardActivity[];
  pipelineDistribution: DashboardPipelineDistribution[];
};

const OPPORTUNITIES_LIMIT = 5;
const RECENT_SEARCHES_LIMIT = 5;
const RECENT_ACTIVITIES_LIMIT = 8;

export async function getDashboardData(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<DashboardData> {
  const [metricsResult, opportunitiesResult, searchesResult, activitiesResult, pipelineResult] =
    await Promise.all([
      supabase.rpc("get_dashboard_metrics", { org_id: organizationId }).maybeSingle(),
      supabase.rpc("get_dashboard_opportunities", {
        org_id: organizationId,
        max_items: OPPORTUNITIES_LIMIT,
      }),
      supabase
        .from("searches")
        .select("id, city, state, segment, status, total_found, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(RECENT_SEARCHES_LIMIT),
      supabase
        .from("activities")
        .select("id, type, payload, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(RECENT_ACTIVITIES_LIMIT),
      supabase.rpc("get_dashboard_pipeline_distribution", { org_id: organizationId }),
    ]);

  if (metricsResult.error || !metricsResult.data) {
    throw new Error("DASHBOARD_METRICS_FAILED");
  }
  if (opportunitiesResult.error) {
    throw new Error("DASHBOARD_OPPORTUNITIES_FAILED");
  }
  if (searchesResult.error) {
    throw new Error("DASHBOARD_SEARCHES_FAILED");
  }
  if (activitiesResult.error) {
    throw new Error("DASHBOARD_ACTIVITIES_FAILED");
  }
  if (pipelineResult.error) {
    throw new Error("DASHBOARD_PIPELINE_DISTRIBUTION_FAILED");
  }

  return {
    metrics: parseDashboardMetrics(metricsResult.data),
    opportunities: parseDashboardOpportunities(opportunitiesResult.data ?? []),
    recentSearches: parseDashboardSearches(searchesResult.data ?? []),
    recentActivities: parseDashboardActivities(activitiesResult.data ?? []),
    pipelineDistribution: parseDashboardPipelineDistribution(pipelineResult.data ?? []),
  };
}
