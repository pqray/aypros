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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Progress,
  ScoreBadge,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
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
  PiInfo,
  PiKanban,
  PiMagnifyingGlass,
  PiMapPin,
  PiPhone,
  PiWarningCircle,
} from "react-icons/pi";
import { SiInstagram } from "react-icons/si";
import { useAppContext } from "@/components/shell/use-app-context";
import { AiGenerationsCard } from "@/features/ai/components/ai-generations-card";
import { useCreateLead } from "@/features/pipeline/queries";
import { formatRelativeTime } from "@/lib/format";
import { useTabParam } from "@/lib/use-tab-param";
import { downloadBusinessReportPdf } from "../api";
import { barToneClass, DiagnosticOverviewCard, MaturityCard } from "./business-diagnostic";
import {
  useBusinessAuditSummary,
  useRefreshBusinessData,
  useRunBusinessAudit,
  useToggleFavorite,
} from "../queries";
import { SegmentAuditDetailBadges } from "./segment-audit-badges";

const confidenceLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
} as const;

const BUSINESS_TABS = ["overview", "metrics", "ai"] as const;
type BusinessTab = (typeof BUSINESS_TABS)[number];

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
  const [activeTab, setActiveTab] = useTabParam<BusinessTab>("tab", "overview", BUSINESS_TABS);

  function handleAudit() {
    audit.mutate(undefined, {
      onSuccess: () => toast.success("Auditoria concluida."),
      onError: () => toast.error("Não foi possível auditar o site."),
    });
  }

  function handleRefresh() {
    refresh.mutate(undefined, {
      onSuccess: () => toast.success("Dados atualizados."),
      onError: () => toast.error("Não foi possível atualizar os dados."),
    });
  }

  function handleToggleFavorite() {
    if (!summary.data) return;
    toggleFavorite.mutate(
      { businessId, favorited: !summary.data.favorited },
      { onError: () => toast.error("Não foi possível atualizar o favorito.") },
    );
  }

  function handleAddToPipeline() {
    createLead.mutate(businessId, {
      onSuccess: (response) => {
        toast.success(response.created ? "Lead adicionado ao pipeline." : "Esta empresa já está no pipeline.");
      },
      onError: () => toast.error("Não foi possível adicionar ao pipeline."),
    });
  }

  async function handleDownloadReport() {
    if (!summary.data) return;
    setReportDownloading(true);
    try {
      await downloadBusinessReportPdf(businessId, summary.data.business.name);
      toast.success("Diagnóstico baixado.");
    } catch {
      toast.error("Não foi possível baixar o diagnóstico.");
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
        title="Empresa não encontrada"
        description="Não encontramos esta empresa no histórico da organização."
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
  const socialLabel = business.socialOnly
    ? business.socialPlatform?.includes("instagram")
      ? "Instagram"
      : "Rede social"
    : null;

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
                  Baixar diagnóstico (PDF)
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
              label="Endereço"
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
          {socialLabel ? (
            <BusinessMetaItem
              icon={<SiInstagram className="size-4" aria-hidden />}
              label="Canal social"
              value={`${socialLabel} detectado como presença principal`}
            />
          ) : null}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as BusinessTab)}>
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="ai">Abordagem IA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <DiagnosticOverviewCard
            businessId={businessId}
            onDownloadPdf={() => void handleDownloadReport()}
            downloading={reportDownloading}
          />

          <Card>
            <CardHeader>
              <CardTitle>Presença digital</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <Badge variant="warning">Sem site próprio</Badge>
              )}
              {latestAudit ? (
                <SegmentAuditDetailBadges
                  segment={business.segment}
                  detections={latestAudit.detections}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma análise registrada ainda — rode &ldquo;Reanalisar&rdquo; para detectar
                  presença digital e sinais do segmento.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Potencial da oportunidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestScore ? (
                  <>
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-4xl font-semibold tabular-nums">
                        {latestScore.score}
                        <span className="text-base font-normal text-muted-foreground">/100</span>
                      </p>
                      <div className="flex flex-col items-end gap-1">
                        <ScoreBadge level={latestScore.level} score={latestScore.score} />
                        <Badge variant="secondary">
                          Confiança {confidenceLabels[latestScore.confidence]}
                        </Badge>
                      </div>
                    </div>
                    <Progress
                      value={latestScore.score}
                      aria-label={`Score ${latestScore.score} de 100`}
                      indicatorClassName={barToneClass(latestScore.score)}
                    />
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Impacto no score
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Como o score é calculado"
                              className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <PiInfo aria-hidden />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            O score mede oportunidade comercial. Cada item vem da auditoria do site,
                            dados públicos da empresa e sinais de presença digital. Valores positivos
                            aumentam a prioridade; valores negativos reduzem.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      {latestScore.reasons.map((reason) => (
                        <div key={reason.code} className="flex justify-between gap-3 text-sm">
                          <span className="min-w-0">{reason.label}</span>
                          <span
                            className={cn(
                              "shrink-0 font-medium tabular-nums",
                              reason.impact > 0 ? "text-success" : "text-muted-foreground",
                            )}
                          >
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
                    O score será calculado após a primeira análise ou automaticamente para empresas
                    sem site.
                  </p>
                )}
              </CardContent>
            </Card>

            <MaturityCard
              businessId={businessId}
              responseTimeMs={latestAudit?.responseTimeMs ?? null}
              redirectCount={latestAudit?.redirectCount ?? null}
            />
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <AiGenerationsCard businessId={businessId} leadId={leadId} phone={business.phone} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
