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
import {
  PiArrowRight,
  PiChartLine,
  PiCheckCircle,
  PiDownloadSimple,
  PiQuestion,
  PiWarningCircle,
} from "react-icons/pi";
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
 * Diagnóstico completo na Visão geral: mesma fonte do PDF (GET /report),
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
  const problemFindings = findings.filter((finding) => finding.status === "problem");
  const okFindings = findings.filter((finding) => finding.status === "ok");
  const unknownFindings = findings.filter((finding) => finding.status === "unknown");

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
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-center gap-2">
              <PiWarningCircle className="text-destructive" aria-hidden />
              <p className="text-2xl font-semibold">{problemFindings.length}</p>
            </div>
            <p className="mt-1 text-xs font-medium text-destructive">pontos de atenção</p>
          </div>
          <div className="rounded-lg border border-warning/25 bg-warning/10 p-3">
            <div className="flex items-center gap-2">
              <PiArrowRight className="text-warning" aria-hidden />
              <p className="text-2xl font-semibold">{recommendations.length}</p>
            </div>
            <p className="mt-1 text-xs font-medium text-warning">recomendações</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <PiQuestion className="text-muted-foreground" aria-hidden />
              <p className="text-2xl font-semibold">{unknownFindings.length}</p>
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground">não verificados</p>
          </div>
        </div>

        {problemFindings.length > 0 ? (
          <section className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Prioridades do diagnóstico</p>
              <p className="text-xs text-muted-foreground">
                Pontos que mais prejudicam conversão, confiança ou descoberta da empresa.
              </p>
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              {problemFindings.map((finding) => (
                <div key={finding.title} className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-destructive/10 text-destructive">
                      <PiWarningCircle aria-hidden />
                    </span>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-destructive">{finding.title}</p>
                        <Badge variant="destructive">Atenção</Badge>
                      </div>
                      <p className="text-sm leading-5 text-foreground">{finding.body}</p>
                      <div className="rounded-md bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Impacto: </span>
                        {finding.impact}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {okFindings.length > 0 || unknownFindings.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]">
            {okFindings.length > 0 ? (
              <section className="rounded-lg border border-success/20 bg-success/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <PiCheckCircle className="text-success" aria-hidden />
                  <p className="text-sm font-semibold">Sinais saudáveis</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {okFindings.map((finding) => (
                    <div key={finding.title} className="rounded-md bg-background/80 px-3 py-2">
                      <p className="text-sm font-medium">{finding.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {finding.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {unknownFindings.length > 0 ? (
              <section className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <PiQuestion className="text-muted-foreground" aria-hidden />
                  <p className="text-sm font-semibold">Não verificados</p>
                </div>
                <div className="space-y-2">
                  {unknownFindings.map((finding) => (
                    <div
                      key={finding.title}
                      className="flex items-center justify-between gap-3 rounded-md bg-background/80 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm">{finding.title}</span>
                      <Badge variant="secondary">Pendente</Badge>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {findings.length > 0 &&
        problemFindings.length === 0 &&
        okFindings.length === 0 &&
        unknownFindings.length === 0 ? (
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
        ) : null}

        {recommendations.length > 0 || nextSteps.length > 0 ? (
          <div className="grid gap-3 border-t pt-4 lg:grid-cols-2">
            {recommendations.length > 0 ? (
              <section className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Recomendações</p>
                <div className="mt-3 space-y-2">
                  {recommendations.map((recommendation) => (
                    <div key={recommendation.text} className="flex items-start gap-2 text-sm">
                      <Badge variant={recommendation.priority === "alta" ? "destructive" : "warning"}>
                        {recommendation.priority === "alta" ? "Alta" : "Média"}
                      </Badge>
                      <span className="min-w-0 leading-5">{recommendation.text}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {nextSteps.length > 0 ? (
              <section className="rounded-lg border p-4">
                <p className="text-sm font-semibold">Próximos passos</p>
                <div className="mt-3 space-y-2">
                  {nextSteps.map((step, index) => (
                    <div key={step} className="flex items-start gap-3 text-sm">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="min-w-0 leading-5 text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
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

/** Maturidade digital por eixo com barras; substitui os cards secos de métrica. */
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
