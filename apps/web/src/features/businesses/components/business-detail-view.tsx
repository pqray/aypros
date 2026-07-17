"use client";

import {
  Badge,
  BusinessLogo,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ScoreBadge,
  Skeleton,
  toast,
} from "@aypros/ui";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  PiArrowLeft,
  PiArrowsClockwise,
  PiDownloadSimple,
  PiDotsThreeVertical,
  PiGlobe,
  PiHeart,
  PiHeartFill,
  PiKanban,
  PiMagnifyingGlass,
  PiMapPin,
  PiPhone,
  PiWarningCircle,
} from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { AiGenerationsCard } from "@/features/ai/components/ai-generations-card";
import { useCreateLead } from "@/features/pipeline/queries";
import { formatRelativeTime } from "@/lib/format";
import { downloadBusinessReportPdf } from "../api";
import {
  useBusinessAuditSummary,
  useRefreshBusinessData,
  useRunBusinessAudit,
  useToggleFavorite,
} from "../queries";
import { SegmentAuditDetailBadges } from "./segment-audit-badges";

const confidenceLabels = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
} as const;

function detectionLabel(state: string | undefined) {
  if (state === "detected") return "Detectado";
  if (state === "not_detected") return "Nao detectado";
  return "Inconclusivo";
}

function BusinessMetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <div className="truncate text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function BusinessDetailView({ businessId }: { businessId: string }) {
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const summary = useBusinessAuditSummary(businessId);
  const audit = useRunBusinessAudit(businessId);
  const refresh = useRefreshBusinessData(businessId);
  const toggleFavorite = useToggleFavorite(orgId);
  const createLead = useCreateLead(orgId);
  const [reportDownloading, setReportDownloading] = useState(false);

  function handleAudit() {
    audit.mutate(undefined, {
      onSuccess: () => toast.success("Auditoria concluida."),
      onError: () => toast.error("Nao foi possivel auditar o site."),
    });
  }

  function handleRefresh() {
    refresh.mutate(undefined, {
      onSuccess: () => toast.success("Dados atualizados."),
      onError: () => toast.error("Nao foi possivel atualizar os dados."),
    });
  }

  function handleToggleFavorite() {
    if (!summary.data) return;
    toggleFavorite.mutate(
      { businessId, favorited: !summary.data.favorited },
      { onError: () => toast.error("Nao foi possivel atualizar o favorito.") },
    );
  }

  function handleAddToPipeline() {
    createLead.mutate(businessId, {
      onSuccess: (response) => {
        toast.success(response.created ? "Lead adicionado ao pipeline." : "Esta empresa ja esta no pipeline.");
      },
      onError: () => toast.error("Nao foi possivel adicionar ao pipeline."),
    });
  }

  async function handleDownloadReport() {
    if (!summary.data) return;
    setReportDownloading(true);
    try {
      await downloadBusinessReportPdf(businessId, summary.data.business.name);
      toast.success("Diagnostico baixado.");
    } catch {
      toast.error("Nao foi possivel baixar o diagnostico.");
    } finally {
      setReportDownloading(false);
    }
  }

  if (summary.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!summary.data) {
    return (
      <EmptyState
        icon={<PiWarningCircle />}
        title="Empresa nao encontrada"
        description="Nao encontramos esta empresa no historico da organizacao."
        action={
          <Button asChild variant="outline">
            <Link href="/businesses">Voltar para empresas</Link>
          </Button>
        }
      />
    );
  }

  const { business, latestAudit, latestScore, refreshedAt, providerStatus, favorited, leadId } =
    summary.data;
  const location = business.address ?? [business.city, business.state].filter(Boolean).join("/");
  const freshnessLabel = refreshedAt ? formatRelativeTime(refreshedAt) : "Nunca atualizado";

  return (
    <div className="space-y-4">
      <div className="space-y-4 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <BusinessLogo name={business.name} websiteUrl={business.websiteUrl} className="size-12 shrink-0" />
            <div className="min-w-0 space-y-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {business.name}
              </h1>
              <p className="text-sm text-muted-foreground">Detalhes, auditoria e score da empresa.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:justify-end">
            <Button onClick={handleAudit} loading={audit.isPending} disabled={!business.websiteUrl}>
              <PiMagnifyingGlass aria-hidden />
              Reanalisar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" aria-label="Mais acoes">
                  <PiDotsThreeVertical aria-hidden />
                  Mais
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Acoes da empresa</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {leadId ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/pipeline/${leadId}`}>
                      <PiKanban aria-hidden />
                      Ver no pipeline
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    disabled={createLead.isPending}
                    onSelect={(event) => {
                      event.preventDefault();
                      handleAddToPipeline();
                    }}
                  >
                    <PiKanban aria-hidden />
                    Adicionar ao pipeline
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  disabled={toggleFavorite.isPending}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleToggleFavorite();
                  }}
                >
                  {favorited ? (
                    <PiHeartFill className="text-destructive" aria-hidden />
                  ) : (
                    <PiHeart aria-hidden />
                  )}
                  {favorited ? "Favoritado" : "Favoritar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={refresh.isPending}
                  onSelect={(event) => {
                    event.preventDefault();
                    handleRefresh();
                  }}
                >
                  <PiArrowsClockwise aria-hidden />
                  Atualizar dados
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={reportDownloading}
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleDownloadReport();
                  }}
                >
                  <PiDownloadSimple aria-hidden />
                  Baixar diagnostico (PDF)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/businesses">
                    <PiArrowLeft aria-hidden />
                    Voltar para empresas
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <BusinessMetaItem
            icon={<PiArrowsClockwise className="size-4" aria-hidden />}
            label="Dados"
            value={
              providerStatus === "removed"
                ? "Place removido pelo provedor"
                : `Atualizados ${freshnessLabel}`
            }
          />
          {location ? (
            <BusinessMetaItem
              icon={<PiMapPin className="size-4" aria-hidden />}
              label="Endereco"
              value={location}
            />
          ) : null}
          {business.phone ? (
            <BusinessMetaItem
              icon={<PiPhone className="size-4" aria-hidden />}
              label="Telefone"
              value={
                <a href={`tel:${business.phone}`} className="hover:underline">
                  {business.phone}
                </a>
              }
            />
          ) : null}
          {business.websiteUrl ? (
            <BusinessMetaItem
              icon={<PiGlobe className="size-4" aria-hidden />}
              label="Site"
              value={
                <a
                  href={business.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {business.websiteUrl}
                </a>
              }
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <Card>
          <CardHeader>
            <CardTitle>Auditoria HTTP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {business.websiteUrl ? (
              <a
                href={business.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-info hover:underline"
              >
                <PiGlobe aria-hidden />
                {business.websiteUrl}
              </a>
            ) : (
              <Badge variant="warning">Sem site</Badge>
            )}

            {!latestAudit ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma auditoria registrada ainda. Empresas sem site ja recebem score com baixa
                confianca.
              </p>
            ) : (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Status HTTP</dt>
                  <dd className="font-medium">
                    {latestAudit.httpStatus ?? latestAudit.errorCode ?? "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">HTTPS</dt>
                  <dd className="font-medium">{latestAudit.isHttps ? "Sim" : "Nao"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tempo de resposta</dt>
                  <dd className="font-medium">
                    {latestAudit.responseTimeMs !== null
                      ? `${latestAudit.responseTimeMs} ms`
                      : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Redirecionamentos</dt>
                  <dd className="font-medium">{latestAudit.redirectCount ?? 0}</dd>
                </div>
              </dl>
            )}

            {latestAudit ? (
              <SegmentAuditDetailBadges segment={business.segment} detections={latestAudit.detections} />
            ) : null}

            {latestAudit ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["hasViewport", "Responsivo"],
                    ["hasTitle", "Title"],
                    ["hasDescription", "Description"],
                    ["outdated", "Desatualizado"],
                    ["siteDown", "Fora do ar"],
                    ["basicBuilder", "Builder basico"],
                    ["linkInBio", "Link-in-bio"],
                    ["deliveryPlatform", "Delivery"],
                    ["menuOnline", "Cardapio online"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="rounded-md border px-3 py-2 text-sm">
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {detectionLabel(latestAudit.detections[key]?.state)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestScore ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <ScoreBadge level={latestScore.level} score={latestScore.score} />
                  <Badge variant="secondary">
                    Confianca {confidenceLabels[latestScore.confidence]}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {latestScore.reasons.map((reason) => (
                    <div key={reason.code} className="flex justify-between gap-3 text-sm">
                      <span>{reason.label}</span>
                      <span className="font-medium tabular-nums">
                        {reason.impact > 0 ? `+${reason.impact}` : reason.impact}
                      </span>
                    </div>
                  ))}
                </div>
                {latestScore.suggestedServices.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {latestScore.suggestedServices.map((service) => (
                      <Badge key={service} variant="outline">
                        {service}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                O score sera calculado apos a primeira auditoria ou automaticamente para empresas
                sem site.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <AiGenerationsCard businessId={businessId} leadId={leadId} phone={business.phone} />
    </div>
  );
}
