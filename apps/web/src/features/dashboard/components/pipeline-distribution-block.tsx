"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@aypros/ui";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { PiChartPieSlice } from "react-icons/pi";
import { leadStageLabels } from "@/features/pipeline/board";
import type { DashboardPipelineDistribution } from "../schemas";

// Tokens de `03-design-system.md` — verde reservado a "ganho" (success), vermelho a
// "perdido" (destructive); as etapas intermediárias seguem a progressão neutro → quente.
const STAGE_COLORS: Record<DashboardPipelineDistribution["stage"], string> = {
  new: "var(--muted-foreground)",
  contacted: "var(--info)",
  in_conversation: "var(--warning)",
  proposal_sent: "var(--primary)",
  won: "var(--success)",
  lost: "var(--destructive)",
};

export function PipelineDistributionBlock({
  distribution,
}: {
  distribution: DashboardPipelineDistribution[];
}) {
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const chartData = distribution
    .filter((item) => item.count > 0)
    .map((item) => ({ stage: item.stage, label: leadStageLabels[item.stage], value: item.count }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição do pipeline</CardTitle>
        <CardDescription>Como os leads estão distribuídos entre as etapas agora.</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState
            icon={<PiChartPieSlice />}
            title="Pipeline vazio"
            description="Adicione empresas ao pipeline para ver a distribuição por etapa."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/businesses">Ver empresas</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="60%"
                    outerRadius="100%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value, name) => [`${value} ${value === 1 ? "lead" : "leads"}`, name]}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full min-w-0 flex-1 space-y-1.5">
              {distribution.map((item) => {
                const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                return (
                  <li key={item.stage} className="flex items-center gap-2 text-sm">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: STAGE_COLORS[item.stage] }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {leadStageLabels[item.stage]}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {item.count} · {percent}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
