import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseDashboardActivities,
  parseDashboardMetrics,
  parseDashboardOpportunities,
  parseDashboardSearches,
  parseDashboardTodayLeads,
  type DashboardActivity,
  type DashboardMetrics,
  type DashboardOpportunity,
  type DashboardSearch,
  type DashboardTodayLead,
} from "./schemas";

export type DashboardData = {
  metrics: DashboardMetrics;
  opportunities: DashboardOpportunity[];
  recentSearches: DashboardSearch[];
  recentActivities: DashboardActivity[];
  todayLeads: DashboardTodayLead[];
};

const OPPORTUNITIES_LIMIT = 5;
const RECENT_SEARCHES_LIMIT = 5;
const RECENT_ACTIVITIES_LIMIT = 8;
const TODAY_LEADS_LIMIT = 8;

export async function getDashboardData(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<DashboardData> {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [metricsResult, opportunitiesResult, searchesResult, activitiesResult, todayResult] = await Promise.all([
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
    supabase
      .from("leads")
      .select("id, business_id, next_action, next_action_at, business:businesses(name)")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .not("next_action_at", "is", null)
      .lte("next_action_at", endOfToday.toISOString())
      .order("next_action_at", { ascending: true })
      .limit(TODAY_LEADS_LIMIT),
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
  if (todayResult.error) {
    throw new Error("DASHBOARD_TODAY_FAILED");
  }

  return {
    metrics: parseDashboardMetrics(metricsResult.data),
    opportunities: parseDashboardOpportunities(opportunitiesResult.data ?? []),
    recentSearches: parseDashboardSearches(searchesResult.data ?? []),
    recentActivities: parseDashboardActivities(activitiesResult.data ?? []),
    todayLeads: parseDashboardTodayLeads(
      ((todayResult.data ?? []) as unknown as Array<{
        id: string;
        business_id: string;
        next_action: string | null;
        next_action_at: string;
        business: { name: string } | Array<{ name: string }> | null;
      }>).map((row) => ({
        id: row.id,
        business_id: row.business_id,
        business_name: Array.isArray(row.business)
          ? (row.business[0]?.name ?? "Lead sem empresa")
          : (row.business?.name ?? "Lead sem empresa"),
        next_action: row.next_action,
        next_action_at: row.next_action_at,
      })),
    ),
  };
}
