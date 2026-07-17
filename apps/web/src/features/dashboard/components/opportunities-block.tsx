"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ScoreBadge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from "@aypros/ui";
import Link from "next/link";
import { PiKanban, PiTrendUp } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { useCreateLead } from "@/features/pipeline/queries";
import type { DashboardOpportunity } from "../schemas";

export function OpportunitiesBlock({ opportunities }: { opportunities: DashboardOpportunity[] }) {
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const createLead = useCreateLead(orgId);

  function handleAddToPipeline(businessId: string) {
    createLead.mutate(businessId, {
      onSuccess: (response) => {
        toast.success(response.created ? "Lead adicionado ao pipeline." : "Esta empresa já está no pipeline.");
      },
      onError: () => toast.error("Não foi possível adicionar ao pipeline."),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Oportunidades em destaque</CardTitle>
        <CardDescription>Empresas com maior potencial que ainda não viraram lead.</CardDescription>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <EmptyState
            icon={<PiTrendUp />}
            title="Nenhuma oportunidade ainda"
            description="Faça pesquisas e analise os sites das empresas para gerar scores de oportunidade."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/discovery">Descobrir empresas</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {opportunities.map((opportunity) => (
              <li
                key={opportunity.businessId}
                className="flex items-center gap-2 rounded-md px-2 py-3 transition-colors hover:bg-accent"
              >
                <Link
                  href={`/businesses/${opportunity.businessId}`}
                  className="min-w-0 flex-1 space-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {opportunity.businessName}
                  </p>
                  {opportunity.city ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {opportunity.city}
                      {opportunity.state ? `/${opportunity.state}` : ""}
                    </p>
                  ) : null}
                  {opportunity.mainReason ? (
                    <p className="truncate text-xs text-muted-foreground">{opportunity.mainReason}</p>
                  ) : null}
                </Link>
                <ScoreBadge level={opportunity.level} score={opportunity.score} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Adicionar ao pipeline"
                      loading={createLead.isPending && createLead.variables === opportunity.businessId}
                      onClick={() => handleAddToPipeline(opportunity.businessId)}
                    >
                      <PiKanban aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Adicionar ao pipeline</TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
