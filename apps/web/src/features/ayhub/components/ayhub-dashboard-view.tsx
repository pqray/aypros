"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@aypros/ui";
import type { AyhubCostType } from "@aypros/types";
import Link from "next/link";
import { PiBookOpenText, PiBuildings, PiInfo, PiTrendUp, PiUsers, PiWarningCircle } from "react-icons/pi";
import { useAyhubDashboard } from "../queries";

const costTypeLabels: Record<AyhubCostType, string> = {
  domain: "Domínio",
  hosting: "Hospedagem",
  storage: "Storage",
  other: "Outro",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function InfoTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center gap-2">
      <CardTitle>{title}</CardTitle>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Sobre ${title}`}
            className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PiInfo aria-hidden className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{description}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function InfoStatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Sobre ${label}`}
                  className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <PiInfo aria-hidden className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{description}</TooltipContent>
            </Tooltip>
          </div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground [&_svg]:size-4">
          <PiTrendUp aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)]">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-56" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-44" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AyhubDashboardView() {
  const dashboard = useAyhubDashboard();
  const hasRenewalAlerts = (dashboard.data?.renewalAlerts.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard AYhub"
        description="Visão geral de sites, receita recorrente e margem por cliente."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/ayhub/docs">
                <PiBookOpenText aria-hidden />
                Documentação
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ayhub/clients">
                <PiUsers aria-hidden />
                Clientes
              </Link>
            </Button>
          </>
        }
      />

      {dashboard.isLoading ? (
        <DashboardSkeleton />
      ) : !dashboard.data ? (
        <EmptyState title="Não foi possível carregar o dashboard" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Sites ativos" value={dashboard.data.totalActiveSites} icon={<PiBuildings />} />
            <InfoStatCard
              label="MRR bruto"
              value={formatCurrency(dashboard.data.grossMrr)}
              description="Soma das mensalidades de manutenção dos clientes ativos. Não desconta custos de domínio, hospedagem, storage ou outros custos recorrentes."
            />
            <InfoStatCard
              label="MRR líquido"
              value={formatCurrency(dashboard.data.netMrr)}
              description="MRR bruto menos os custos recorrentes mensais dos sites. É uma aproximação da receita recorrente que sobra antes de impostos e outros custos fora do AYhub."
            />
          </div>

          <div className={hasRenewalAlerts ? "grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)]" : "grid gap-4"}>
            <Card>
              <CardHeader>
                <InfoTitle
                  title="Margem por cliente"
                  description="Compara a mensalidade de manutenção do cliente com os custos recorrentes mensais dos sites dele. A margem mostra quanto sobra proporcionalmente."
                />
              </CardHeader>
              <CardContent>
                {dashboard.data.clientMargins.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum cliente ainda.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor de manutenção</TableHead>
                        <TableHead>Custo mensal</TableHead>
                        <TableHead>Margem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboard.data.clientMargins.map((client) => (
                        <TableRow key={client.clientId}>
                          <TableCell>
                            <Link href={`/ayhub/${client.clientId}`} className="font-medium text-foreground hover:underline">
                              {client.clientName}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {client.maintenanceValue !== null ? formatCurrency(client.maintenanceValue) : "-"}
                          </TableCell>
                          <TableCell>{formatCurrency(client.monthlyCostTotal)}</TableCell>
                          <TableCell>
                            {client.marginPercent !== null ? (
                              <Badge variant={client.marginPercent < 0 ? "destructive" : "success"}>
                                {client.marginPercent.toFixed(0)}%
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {hasRenewalAlerts ? (
              <Card>
                <CardHeader>
                  <InfoTitle
                    title="Renovações nos próximos 30 dias"
                    description="Inclui mensalidades de clientes ativos calculadas pelo ciclo mensal e custos com data de renovação cadastrada, como domínio ou hospedagem."
                  />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboard.data.renewalAlerts.map((alert, index) => {
                      const href =
                        alert.type === "maintenance" || !alert.siteId
                          ? `/ayhub/${alert.clientId}`
                          : `/ayhub/sites/${alert.siteId}`;
                      const title =
                        alert.type === "maintenance"
                          ? alert.clientName
                          : alert.siteSlug || alert.siteId || alert.clientName;
                      const detail =
                        alert.type === "maintenance"
                          ? `Manutenção mensal · ${formatCurrency(alert.amount ?? 0)}`
                          : `${alert.clientName} · ${alert.costType ? costTypeLabels[alert.costType] : "Custo"} · ${formatCurrency(alert.amount ?? 0)}`;

                      return (
                        <div
                          key={`${alert.type}-${alert.clientId}-${alert.siteId ?? "client"}-${index}`}
                          className="space-y-2 rounded-md border p-3 text-sm"
                        >
                          <div className="min-w-0">
                            <Link href={href} className="font-medium text-foreground hover:underline">
                              {title}
                            </Link>
                            <p className="text-xs text-muted-foreground">{detail}</p>
                            <p className="text-xs text-muted-foreground">{alert.nextRenewal}</p>
                          </div>
                          <Badge variant={alert.daysRemaining < 0 ? "destructive" : "warning"}>
                            <PiWarningCircle aria-hidden />
                            {alert.daysRemaining < 0
                              ? `${Math.abs(alert.daysRemaining)}d atrasado`
                              : `${alert.daysRemaining}d restantes`}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
