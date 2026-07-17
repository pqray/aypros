"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Skeleton,
  cn,
} from "@aypros/ui";
import type { BusinessReportFindingStatus } from "@aypros/types";
import { PiChartLine, PiDownloadSimple } from "react-icons/pi";
import { useBusinessReport } from "../queries";

const findingBadges: Record<
  BusinessReportFindingStatus,
  { label: string; variant: "destructive" | "success" | "secondary" }
> = {
  problem: { label: "Ponto de atenção", variant: "destructive" },
  ok: { label: "Ok", variant: "success" },
  unknown: { label: "Não verificado", variant: "secondary" },
};

export function barToneClass(value: number): string {
  if (value >= 70) return "bg-success";
  if (value >= 40) return "bg-warning";
  return "bg-destructive";
}

/**
 * Diagnóstico completo na Visão geral — mesma fonte do PDF (GET /report),
 * então baixar o PDF vira opção, não obrigação.
 */
export function DiagnosticOverviewCard({
  businessId,
  onDownloadPdf,
  downloading,
}: {
  businessId: string;
  onDownloadPdf: () => void;
  downloading: boolean;
}) {
  const report = useBusinessReport(businessId);

  if (report.isLoading) {
    return <Skeleton className="h-72" />;
  }
  if (!report.data) {
    return null;
  }

  const { summary, httpStatusNote, findings, recommendations, nextSteps } = report.data;
  const problemCount = findings.filter((finding) => finding.status === "problem").length;
  const unknownCount = findings.filter((finding) => finding.status === "unknown").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Resumo da oportunidade</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Diagnóstico comercial no app; o PDF fica como material opcional.
          </p>
        </div>
        <Button variant="outline" size="sm" loading={downloading} onClick={onDownloadPdf}>
          <PiDownloadSimple aria-hidden />
          Baixar PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-md bg-background p-2 text-primary shadow-sm">
              <PiChartLine aria-hidden />
            </span>
            <div className="min-w-0 space-y-2">
              <p className="text-sm leading-6 text-foreground">{summary}</p>
              {httpStatusNote ? (
                <Badge variant="secondary">Verificação automática limitada</Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-semibold">{problemCount}</p>
            <p className="text-xs text-muted-foreground">pontos de atenção</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-semibold">{recommendations.length}</p>
            <p className="text-xs text-muted-foreground">recomendações</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-semibold">{unknownCount}</p>
            <p className="text-xs text-muted-foreground">não verificados</p>
          </div>
        </div>

        <div className="space-y-3">
          {findings.map((finding) => {
            const badge = findingBadges[finding.status];
            return (
              <div key={finding.title} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      finding.status === "problem" ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {finding.title}
                  </p>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{finding.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{finding.impact}</p>
              </div>
            );
          })}
        </div>

        {recommendations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Recomendações</p>
            {recommendations.map((recommendation) => (
              <div key={recommendation.text} className="flex items-center gap-2 text-sm">
                <Badge variant={recommendation.priority === "alta" ? "destructive" : "warning"}>
                  {recommendation.priority === "alta" ? "Alta" : "Média"}
                </Badge>
                <span className="min-w-0">{recommendation.text}</span>
              </div>
            ))}
          </div>
        ) : null}

        {nextSteps.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold">Próximos passos</p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              {nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function axisTone(value: number | null): { label: string; className: string; color: string } {
  if (value === null) {
    return { label: "Não verificado", className: "text-muted-foreground", color: "hsl(var(--muted))" };
  }
  if (value >= 70) return { label: "Forte", className: "text-success", color: "hsl(var(--success))" };
  if (value >= 40) return { label: "Médio", className: "text-warning", color: "hsl(var(--warning))" };
  return { label: "Crítico", className: "text-destructive", color: "hsl(var(--destructive))" };
}

function AxisGauge({ label, value }: { label: string; value: number | null }) {
  const tone = axisTone(value);
  const percent = value ?? 0;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div
          className="grid size-16 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${tone.color} ${percent * 3.6}deg, hsl(var(--muted)) 0deg)`,
          }}
          aria-hidden
        >
          <div className="grid size-12 place-items-center rounded-full bg-background text-sm font-semibold">
            {value === null ? "--" : value}
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className={cn("text-xs font-medium", tone.className)}>{tone.label}</p>
        </div>
      </div>
      <Progress
        className="mt-3"
        value={percent}
        aria-label={`${label}: ${value === null ? "não verificado" : `${value} de 100`}`}
        indicatorClassName={value === null ? "bg-muted" : barToneClass(value)}
      />
    </div>
  );
}

/** Maturidade digital por eixo com barras — substitui os cards secos de métrica. */
export function MaturityCard({
  businessId,
  responseTimeMs,
  redirectCount,
}: {
  businessId: string;
  responseTimeMs: number | null;
  redirectCount: number | null;
}) {
  const report = useBusinessReport(businessId);

  if (report.isLoading) {
    return <Skeleton className="h-56" />;
  }
  if (!report.data) {
    return null;
  }

  const meta = [
    responseTimeMs !== null ? `Tempo de resposta: ${responseTimeMs} ms` : null,
    redirectCount !== null && redirectCount > 0 ? `${redirectCount} redirecionamento(s)` : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maturidade digital</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.data.httpStatusNote ? (
          <Badge variant="secondary">Verificação automática limitada</Badge>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {report.data.maturity.map((axis) => (
            <AxisGauge key={axis.label} label={axis.label} value={axis.value} />
          ))}
        </div>

        {meta.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {meta.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
