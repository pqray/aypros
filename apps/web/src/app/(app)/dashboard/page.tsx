import { PageHeader } from "@aypros/ui";
import { redirect } from "next/navigation";
import { ActivitiesBlock } from "@/features/dashboard/components/activities-block";
import { MetricCards } from "@/features/dashboard/components/metric-cards";
import { OpportunitiesBlock } from "@/features/dashboard/components/opportunities-block";
import { PipelineDistributionBlock } from "@/features/dashboard/components/pipeline-distribution-block";
import { QuickSearchForm } from "@/features/dashboard/components/quick-search-form";
import { RecentSearchesBlock } from "@/features/dashboard/components/recent-searches-block";
import { WelcomeHero } from "@/features/dashboard/components/welcome-hero";
import { getDashboardData } from "@/features/dashboard/queries";
import { createClient } from "@/lib/supabase/server";
import { loadServerAppContext } from "@/server/app-context";

export default async function DashboardPage() {
  const supabase = await createClient();
  const context = await loadServerAppContext(supabase);

  if (!context) {
    redirect("/login");
  }
  if (!context.organization) {
    redirect("/onboarding");
  }

  const data = await getDashboardData(supabase, context.organization.id);
  const isNewOrganization = data.metrics.searchesCount === 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={`Visão geral de ${context.organization.name}.`}
        className="pb-2"
      />
      {isNewOrganization ? <WelcomeHero organizationName={context.organization.name} /> : null}
      <MetricCards metrics={data.metrics} />
      <PipelineDistributionBlock distribution={data.pipelineDistribution} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OpportunitiesBlock opportunities={data.opportunities} />
        </div>
        <QuickSearchForm />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RecentSearchesBlock searches={data.recentSearches} />
        <ActivitiesBlock activities={data.recentActivities} />
      </div>
    </div>
  );
}
