"use client";

import {
  Badge,
  BusinessLogo,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Input,
  Label,
  ScoreBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  toast,
} from "@aypros/ui";
import type { ContactChannel, LeadStage, LeadStatus } from "@aypros/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PiArrowLeft,
  PiArrowRight,
  PiClockCountdown,
  PiDownloadSimple,
  PiInfo,
  PiListChecks,
  PiPhoneCall,
  PiSparkle,
  PiTrash,
  PiWarningCircle,
} from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { CollapsibleCard } from "@/components/collapsible-card";
import { AiGenerationsCard } from "@/features/ai/components/ai-generations-card";
import { ApiError } from "@/features/ai/api";
import { useGenerateAi } from "@/features/ai/queries";
import { downloadBusinessReportPdf } from "@/features/businesses/api";
import { useBusinessAuditSummary } from "@/features/businesses/queries";
import { isOverdue, leadStageLabels, needsMoveConfirmation, nextForwardStage } from "../board";
import { formatRelativeTime } from "@/lib/format";
import { useTabParam } from "@/lib/use-tab-param";
import {
  useCreateLeadContact,
  useDeleteLead,
  useLead,
  useOrganizationMembers,
  useUpdateLead,
} from "../queries";
import { ContactCopilotCard } from "./contact-copilot-card";
import { FollowUpPanel } from "./follow-up-panel";
import { LeadActivityTimeline } from "./lead-activity-timeline";
import { LeadNotes } from "./lead-notes";
import { LostReasonDialog } from "./lost-reason-dialog";
import { LostReasonPanel } from "./lost-reason-panel";
import { WonPanel } from "./won-panel";

const leadStatusLabels: Record<LeadStatus, string> = {
  active: "Ativo",
  won: "Ganho",
  lost: "Perdido",
  archived: "Arquivado",
};

function formatCurrency(value: number | null): string | null {
  if (value === null) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function InfoLabel({
  htmlFor,
  label,
  description,
}: {
  htmlFor?: string;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
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
  );
}

const confidenceLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
} as const;

const contactChannelLabels: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  phone: "Telefone",
  other: "Outro",
};

const LEAD_TABS = ["lead", "stage", "notes"] as const;
type LeadTab = (typeof LEAD_TABS)[number];

/** Rótulo da aba central — o que importa fazer muda conforme o estágio (specs/22). */
function stageTabLabel(stage: LeadStage): string {
  switch (stage) {
    case "new":
      return "Abordagem";
    case "contacted":
      return "Acompanhamento";
    case "in_conversation":
    case "proposal_sent":
      return "Copiloto";
    case "won":
      return "Cliente";
    case "lost":
      return "Motivo";
  }
}

const stageBadgeVariant: Record<LeadStage, "secondary" | "success" | "destructive"> = {
  new: "secondary",
  contacted: "secondary",
  in_conversation: "secondary",
  proposal_sent: "secondary",
  won: "success",
  lost: "destructive",
};

/** Etapa atual + avançar/perder, só isso — a etapa em si é comunicada pelo painel abaixo (specs/22). */
function StageProgress({
  current,
  onAdvance,
  onMarkLost,
  disabled,
}: {
  current: LeadStage;
  onAdvance: (stage: LeadStage) => void;
  onMarkLost: () => void;
  disabled?: boolean;
}) {
  const next = nextForwardStage(current);
  const terminal = current === "won" || current === "lost";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Etapa atual</p>
        <Badge variant={stageBadgeVariant[current]}>{leadStageLabels[current]}</Badge>
      </div>
      {!terminal ? (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onMarkLost}>
            Marcar como perdido
          </Button>
          {next ? (
            <Button type="button" size="sm" disabled={disabled} onClick={() => onAdvance(next)}>
              Avançar para {leadStageLabels[next]}
              <PiArrowRight aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Score integrado: nota + confiança + principais motivos (specs fase 17, P1). */
function PotentialBlock({ businessId }: { businessId: string }) {
  const summary = useBusinessAuditSummary(businessId);

  if (summary.isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = summary.data?.latestScore ?? null;

  return (
    <CollapsibleCard storageKey="lead-detail:potential" title="Potencial">
      <CardContent className="space-y-4">
        {score ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <ScoreBadge level={score.level} score={score.score} />
              <Badge variant="secondary">Confiança {confidenceLabels[score.confidence]}</Badge>
            </div>
            {score.reasons.length > 0 ? (
              <div className="space-y-1.5">
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
                      O score mede oportunidade comercial. Cada item vem da auditoria do site, dados
                      públicos da empresa e sinais de presença digital. Valores positivos aumentam a
                      prioridade; valores negativos reduzem.
                    </TooltipContent>
                  </Tooltip>
                </div>
                {score.reasons.slice(0, 5).map((reason) => (
                  <div key={reason.code} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0">{reason.label}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {reason.impact > 0 ? `+${reason.impact}` : reason.impact}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            {score.suggestedServices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {score.suggestedServices.map((service) => (
                  <Badge key={service} variant="outline">
                    {service}
                  </Badge>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem score ainda — rode uma análise na página da empresa.
          </p>
        )}
      </CardContent>
    </CollapsibleCard>
  );
}

function LeadDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-10 w-80 max-w-full" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-96" />
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  );
}

export function LeadDetailView({ leadId }: { leadId: string }) {
  const router = useRouter();
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const detail = useLead(orgId, leadId);
  const members = useOrganizationMembers(orgId);
  const updateLead = useUpdateLead(orgId);
  const deleteLead = useDeleteLead(orgId);
  const createContact = useCreateLeadContact(orgId, leadId);
  const suggestCost = useGenerateAi(orgId, detail.data?.business.id ?? "");

  const [activeTab, setActiveTab] = useTabParam<LeadTab>("tab", "lead", LEAD_TABS);
  const [potentialValue, setPotentialValue] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [domainCostAnnual, setDomainCostAnnual] = useState("");
  const [hostingCostMonthly, setHostingCostMonthly] = useState("");
  const [marginTargetPercent, setMarginTargetPercent] = useState("");
  const [pendingStage, setPendingStage] = useState<LeadStage | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [contactChannel, setContactChannel] = useState<ContactChannel>("whatsapp");
  const [contactNote, setContactNote] = useState("");
  const [reportDownloading, setReportDownloading] = useState(false);

  useEffect(() => {
    if (!detail.data) return;
    setPotentialValue(detail.data.lead.potentialValue?.toString() ?? "");
    setNextAction(detail.data.lead.nextAction ?? "");
    setNextActionDate(detail.data.lead.nextActionAt ? detail.data.lead.nextActionAt.slice(0, 10) : "");
    setDomainCostAnnual(detail.data.lead.domainCostAnnual.toString());
    setHostingCostMonthly(detail.data.lead.hostingCostMonthly.toString());
    setMarginTargetPercent(detail.data.lead.marginTargetPercent?.toString() ?? "");
  }, [detail.data]);

  function saveField(input: Parameters<typeof updateLead.mutate>[0]["input"]) {
    updateLead.mutate(
      { leadId, input },
      { onError: () => toast.error("Não foi possível salvar a alteração.") },
    );
  }

  function handleSuggestCost() {
    suggestCost.mutate("cost_estimate", {
      onSuccess: (response) => {
        const output = response.generation.output;
        if (!output || !("domainCostAnnual" in output)) {
          toast.error("A IA não retornou uma sugestão válida.");
          return;
        }
        setDomainCostAnnual(output.domainCostAnnual.toString());
        setHostingCostMonthly(output.hostingCostMonthly.toString());
        setMarginTargetPercent(output.marginTargetPercent.toString());
        saveField({
          domainCostAnnual: output.domainCostAnnual,
          hostingCostMonthly: output.hostingCostMonthly,
          marginTargetPercent: output.marginTargetPercent,
        });
        toast.success(output.rationale);
      },
      onError: (error) => {
        toast.error(
          error instanceof ApiError && error.body.code === "RATE_LIMITED"
            ? "Limite diário de gerações com IA atingido."
            : "Não foi possível gerar a sugestão.",
        );
      },
    });
  }

  function handleStageChange(stage: LeadStage) {
    if (!detail.data) return;
    if (needsMoveConfirmation(detail.data.lead.stage, stage)) {
      setPendingStage(stage);
      return;
    }
    saveField({ stage });
  }

  function confirmStageChange(lostReason?: string) {
    if (pendingStage) {
      saveField({ stage: pendingStage, ...(lostReason ? { lostReason } : {}) });
      setPendingStage(null);
    }
  }

  function handleApplyCopilotPatch(patch: {
    stage: LeadStage | null;
    status: LeadStatus | null;
    potentialValue: number | null;
  }) {
    if (patch.stage) {
      handleStageChange(patch.stage);
    }
    if (patch.potentialValue !== null && patch.potentialValue !== undefined) {
      saveField({ potentialValue: patch.potentialValue });
    }
  }

  function handleRemoveLead() {
    deleteLead.mutate(leadId, {
      onSuccess: () => {
        toast.success("Lead removido do pipeline. A empresa continua salva.");
        router.push("/pipeline");
      },
      onError: () => toast.error("Não foi possível remover o lead."),
    });
  }

  function handlePotentialValueBlur() {
    if (!detail.data) return;
    const trimmed = potentialValue.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;
    if (parsed === detail.data.lead.potentialValue) return;
    saveField({ potentialValue: parsed });
  }

  function handleDomainCostBlur() {
    if (!detail.data) return;
    const parsed = Number(domainCostAnnual.trim());
    if (Number.isNaN(parsed) || parsed < 0) return;
    if (parsed === detail.data.lead.domainCostAnnual) return;
    saveField({ domainCostAnnual: parsed });
  }

  function handleHostingCostBlur() {
    if (!detail.data) return;
    const parsed = Number(hostingCostMonthly.trim());
    if (Number.isNaN(parsed) || parsed < 0) return;
    if (parsed === detail.data.lead.hostingCostMonthly) return;
    saveField({ hostingCostMonthly: parsed });
  }

  function handleMarginTargetBlur() {
    if (!detail.data) return;
    const trimmed = marginTargetPercent.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed >= 100)) return;
    if (parsed === detail.data.lead.marginTargetPercent) return;
    saveField({ marginTargetPercent: parsed });
  }

  function handleNextActionBlur() {
    if (!detail.data) return;
    const trimmed = nextAction.trim();
    const value = trimmed === "" ? null : trimmed;
    if (value === detail.data.lead.nextAction) return;
    saveField({ nextAction: value });
  }

  function handleNextActionDateChange(value: string) {
    setNextActionDate(value);
    if (!value) {
      saveField({ nextActionAt: null });
      return;
    }
    const iso = new Date(`${value}T00:00:00`).toISOString();
    saveField({ nextActionAt: iso });
  }

  function handleRegisterContact() {
    createContact.mutate(
      { channel: contactChannel, note: contactNote.trim() || undefined },
      {
        onSuccess: () => {
          setContactNote("");
          toast.success("Contato registrado.");
        },
        onError: () => toast.error("Não foi possível registrar o contato."),
      },
    );
  }

  async function handleDownloadReport() {
    if (!detail.data) return;
    setReportDownloading(true);
    try {
      await downloadBusinessReportPdf(detail.data.business.id, detail.data.business.name);
      toast.success("Diagnóstico baixado.");
    } catch {
      toast.error("Não foi possível baixar o diagnóstico.");
    } finally {
      setReportDownloading(false);
    }
  }

  if (detail.isLoading) {
    return <LeadDetailSkeleton />;
  }

  if (!detail.data) {
    return (
      <EmptyState
        icon={<PiWarningCircle />}
        title="Lead não encontrado"
        description="Não encontramos este lead no pipeline da organização."
        action={
          <Button asChild variant="outline">
            <Link href="/pipeline">Voltar ao pipeline</Link>
          </Button>
        }
      />
    );
  }

  const { lead, business, notes, activities } = detail.data;
  const overdue = isOverdue(lead.nextActionAt);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <BusinessLogo name={business.name} websiteUrl={business.websiteUrl} className="size-12 shrink-0" />
          <div className="min-w-0 space-y-1">
            <Link
              href={`/businesses/${business.id}`}
              className="block truncate text-2xl font-semibold tracking-tight text-foreground hover:underline"
            >
              {business.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {[business.city, business.state].filter(Boolean).join("/")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button asChild variant="outline">
            <Link href="/pipeline">
              <PiArrowLeft aria-hidden />
              Pipeline
            </Link>
          </Button>
          <Button variant="outline" loading={reportDownloading} onClick={handleDownloadReport}>
            <PiDownloadSimple aria-hidden />
            Diagnóstico (PDF)
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <PiListChecks aria-hidden />
                Atividades
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetTitle>Atividades</SheetTitle>
              <SheetDescription className="sr-only">
                Histórico de atividades deste lead
              </SheetDescription>
              <div className="mt-4">
                <LeadActivityTimeline activities={activities} />
              </div>
            </SheetContent>
          </Sheet>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            loading={deleteLead.isPending}
            onClick={() => setRemoveOpen(true)}
          >
            <PiTrash aria-hidden />
            Remover do pipeline
          </Button>
        </div>
      </div>

      <StageProgress
        current={lead.stage}
        onAdvance={handleStageChange}
        onMarkLost={() => handleStageChange("lost")}
        disabled={updateLead.isPending}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LeadTab)}>
          <TabsList>
            <TabsTrigger value="lead">Lead</TabsTrigger>
            <TabsTrigger value="stage">{stageTabLabel(lead.stage)}</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          <TabsContent value="lead" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados comerciais</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lead-status">Status comercial</Label>
                  <Select
                    value={lead.status}
                    onValueChange={(value) => saveField({ status: value as LeadStatus })}
                  >
                    <SelectTrigger id="lead-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(leadStatusLabels) as LeadStatus[]).map((status) => (
                        <SelectItem key={status} value={status}>
                          {leadStatusLabels[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-assignee">Responsável</Label>
                  <Select
                    value={lead.assignedTo ?? "none"}
                    onValueChange={(value) => saveField({ assignedTo: value === "none" ? null : value })}
                  >
                    <SelectTrigger id="lead-assignee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {(members.data?.items ?? []).map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.fullName ?? member.userId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-value">Valor potencial (R$)</Label>
                  <Input
                    id="lead-value"
                    type="number"
                    min={0}
                    step="0.01"
                    value={potentialValue}
                    onChange={(event) => setPotentialValue(event.target.value)}
                    onBlur={handlePotentialValueBlur}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-next-action">Próxima ação</Label>
                  <Input
                    id="lead-next-action"
                    placeholder="Ex.: Ligar para confirmar proposta"
                    value={nextAction}
                    onChange={(event) => setNextAction(event.target.value)}
                    onBlur={handleNextActionBlur}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-next-action-date" className={cn(overdue && "text-destructive")}>
                    Data da próxima ação
                    {overdue ? (
                      <span className="ml-1 inline-flex items-center gap-1 text-xs">
                        <PiClockCountdown aria-hidden />
                        Vencida
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    id="lead-next-action-date"
                    type="date"
                    value={nextActionDate}
                    onChange={(event) => handleNextActionDateChange(event.target.value)}
                    className={cn(overdue && "border-destructive")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Último contato</Label>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <PiPhoneCall aria-hidden />
                    {lead.lastContactAt ? formatRelativeTime(lead.lastContactAt) : "Nenhum contato registrado"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <CollapsibleCard
              storageKey="lead-detail:cost-estimate"
              title="Estimativa de custo e proposta"
              headerActions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={suggestCost.isPending}
                  disabled={!orgId}
                  onClick={handleSuggestCost}
                >
                  <PiSparkle aria-hidden />
                  Sugerir com IA
                </Button>
              }
            >
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <InfoLabel
                    htmlFor="lead-domain-cost"
                    label="Custo de domínio (R$/ano)"
                    description="Valor anual estimado para manter o domínio do site, como .com.br ou .com. Ele entra dividido por 12 no custo mensal."
                  />
                  <Input
                    id="lead-domain-cost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={domainCostAnnual}
                    onChange={(event) => setDomainCostAnnual(event.target.value)}
                    onBlur={handleDomainCostBlur}
                  />
                </div>
                <div className="space-y-2">
                  <InfoLabel
                    htmlFor="lead-hosting-cost"
                    label="Custo de hospedagem (R$/mês)"
                    description="Custo mensal de infraestrutura para manter o site online. A estimativa considera hospedagem paga, não gratuita."
                  />
                  <Input
                    id="lead-hosting-cost"
                    type="number"
                    min={15}
                    step="0.01"
                    value={hostingCostMonthly}
                    onChange={(event) => setHostingCostMonthly(event.target.value)}
                    onBlur={handleHostingCostBlur}
                  />
                </div>
                <div className="space-y-2">
                  <InfoLabel
                    htmlFor="lead-margin-target"
                    label="Margem alvo (%)"
                    description="Percentual de margem desejada sobre o custo mensal. Ex.: com 30%, o valor sugerido cobre os custos e reserva 30% como margem."
                  />
                  <Input
                    id="lead-margin-target"
                    type="number"
                    min={0}
                    max={99}
                    step="1"
                    placeholder="Ex.: 30"
                    value={marginTargetPercent}
                    onChange={(event) => setMarginTargetPercent(event.target.value)}
                    onBlur={handleMarginTargetBlur}
                  />
                </div>
                <div className="space-y-2">
                  <InfoLabel
                    label="Custo mensal estimado"
                    description="Soma do custo mensal de hospedagem com o custo anual do domínio dividido por 12."
                  />
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(lead.estimatedMonthlyCost) ?? "—"}
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <InfoLabel
                    label="Valor de manutenção sugerido"
                    description="Valor mensal recomendado para cobrar do cliente, calculado a partir do custo mensal estimado e da margem alvo."
                  />
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(lead.suggestedMaintenanceValue) ?? "Defina a margem alvo para calcular"}
                  </p>
                </div>
              </CardContent>
            </CollapsibleCard>

            <Card>
              <CardHeader>
                <CardTitle>Registrar contato</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <Label htmlFor="contact-channel">Canal</Label>
                  <Select
                    value={contactChannel}
                    onValueChange={(value) => setContactChannel(value as ContactChannel)}
                  >
                    <SelectTrigger id="contact-channel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(contactChannelLabels) as ContactChannel[]).map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {contactChannelLabels[channel]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-note">Nota opcional</Label>
                  <Textarea
                    id="contact-note"
                    rows={2}
                    value={contactNote}
                    onChange={(event) => setContactNote(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="self-end"
                  loading={createContact.isPending}
                  onClick={handleRegisterContact}
                >
                  <PiPhoneCall aria-hidden />
                  Registrar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stage" className="space-y-4">
            {lead.stage === "new" ? (
              <AiGenerationsCard businessId={business.id} leadId={lead.id} phone={business.phone} />
            ) : lead.stage === "contacted" ? (
              <>
                <FollowUpPanel lastContactAt={lead.lastContactAt} />
                <AiGenerationsCard businessId={business.id} leadId={lead.id} phone={business.phone} />
              </>
            ) : lead.stage === "in_conversation" || lead.stage === "proposal_sent" ? (
              <ContactCopilotCard leadId={lead.id} phone={business.phone} onApplyPatch={handleApplyCopilotPatch} />
            ) : lead.stage === "won" ? (
              <WonPanel ayhubClientId={detail.data.ayhubClientId} />
            ) : (
              <LostReasonPanel lostReason={lead.lostReason} />
            )}
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <LeadNotes leadId={leadId} orgId={orgId} notes={notes} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <PotentialBlock businessId={business.id} />
        </div>
      </div>

      <ConfirmDialog
        open={pendingStage !== null && pendingStage !== "lost"}
        onOpenChange={(open) => !open && setPendingStage(null)}
        title={pendingStage ? `Marcar como ${leadStageLabels[pendingStage].toLowerCase()}?` : ""}
        description="Isso também atualiza o status comercial do lead."
        confirmLabel="Confirmar"
        onConfirm={() => confirmStageChange()}
      />

      <LostReasonDialog
        open={pendingStage === "lost"}
        onOpenChange={(open) => !open && setPendingStage(null)}
        onConfirm={(reason) => confirmStageChange(reason)}
      />

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remover do pipeline?"
        description={`"${business.name}" sai do pipeline, mas a empresa continua salva na sua base. Notas deste lead serão removidas.`}
        confirmLabel="Remover"
        onConfirm={handleRemoveLead}
      />
    </div>
  );
}
