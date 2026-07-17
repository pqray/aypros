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
import { PiDownloadSimple } from "react-icons/pi";
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle>Diagnóstico da presença digital</CardTitle>
        <Button variant="outline" size="sm" loading={downloading} onClick={onDownloadPdf}>
          <PiDownloadSimple aria-hidden />
          Baixar PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm text-foreground">{summary}</p>
          {httpStatusNote ? <p className="text-xs text-muted-foreground">{httpStatusNote}</p> : null}
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
    report.data.httpStatusNote,
    responseTimeMs !== null ? `Tempo de resposta: ${responseTimeMs} ms` : null,
    redirectCount !== null && redirectCount > 0 ? `${redirectCount} redirecionamento(s)` : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maturidade digital</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.data.maturity.map((axis) => (
          <div key={axis.label} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>{axis.label}</span>
              <span className="text-xs text-muted-foreground">
                {axis.value === null ? "Não verificado" : `${axis.value}/100`}
              </span>
            </div>
            {axis.value === null ? (
              <Progress value={0} aria-label={`${axis.label}: não verificado`} />
            ) : (
              <Progress
                value={axis.value}
                aria-label={`${axis.label}: ${axis.value} de 100`}
                indicatorClassName={barToneClass(axis.value)}
              />
            )}
          </div>
        ))}
        {meta.length > 0 ? (
          <p className="border-t pt-3 text-xs text-muted-foreground">{meta.join(" · ")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
