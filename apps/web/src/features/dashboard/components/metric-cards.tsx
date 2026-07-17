import { StatCard } from "@aypros/ui";
import { PiBuildings, PiGlobeX, PiKanban, PiMagnifyingGlass } from "react-icons/pi";
import type { DashboardMetrics } from "../schemas";

export function MetricCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Pesquisas realizadas"
        value={metrics.searchesCount}
        icon={<PiMagnifyingGlass />}
        hint={metrics.searchesCount === 0 ? "Nenhuma pesquisa ainda" : undefined}
      />
      <StatCard
        label="Empresas descobertas"
        value={metrics.businessesCount}
        icon={<PiBuildings />}
        hint={metrics.businessesCount === 0 ? "Nenhuma empresa descoberta ainda" : undefined}
      />
      <StatCard
        label="Empresas sem site"
        value={metrics.businessesWithoutWebsiteCount}
        icon={<PiGlobeX />}
        hint={
          metrics.businessesWithoutWebsiteCount === 0 ? "Nenhuma identificada ainda" : undefined
        }
      />
      <StatCard
        label="Leads no pipeline"
        value={metrics.activeLeadsCount}
        icon={<PiKanban />}
        hint={metrics.activeLeadsCount === 0 ? "Pipeline vazio" : undefined}
      />
    </div>
  );
}
