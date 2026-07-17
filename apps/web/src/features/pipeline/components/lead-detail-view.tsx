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
  cn,
  toast,
} from "@aypros/ui";
import type { ContactChannel, LeadStage, LeadStatus } from "@aypros/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PiArrowLeft,
  PiClockCountdown,
  PiDownloadSimple,
  PiListChecks,
  PiPhoneCall,
  PiTrash,
  PiWarningCircle,
} from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { AiGenerationsCard } from "@/features/ai/components/ai-generations-card";
import { downloadBusinessReportPdf } from "@/features/businesses/api";
import { useBusinessAuditSummary } from "@/features/businesses/queries";
import { LEAD_STAGES, isOverdue, leadStageLabels, needsMoveConfirmation } from "../board";
import { formatRelativeTime } from "@/lib/format";
import { useTabParam } from "@/lib/use-tab-param";
import {
  useCreateLeadContact,
  useDeleteLead,
  useLead,
  useOrganizationMembers,
  useUpdateLead,
} from "../queries";
import { LeadActivityTimeline } from "./lead-activity-timeline";
import { LeadNotes } from "./lead-notes";

const leadStatusLabels: Record<LeadStatus, string> = {
  active: "Ativo",
  won: "Ganho",
  lost: "Perdido",
  archived: "Arquivado",
};

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

const LEAD_TABS = ["lead", "ai", "notes"] as const;
type LeadTab = (typeof LEAD_TABS)[number];

function StageStepper({
  current,
  onSelect,
  disabled,
}: {
  current: LeadStage;
  onSelect: (stage: LeadStage) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Estágio do lead"
      className="flex flex-wrap gap-1 rounded-lg border bg-card p-1"
    >
      {LEAD_STAGES.map((stage) => {
        const active = stage === current;
        return (
          <Button
            key={stage}
            type="button"
            size="sm"
            variant={active ? "secondary" : "ghost"}
            aria-pressed={active}
            disabled={disabled}
            className={cn("h-8", active && "font-semibold")}
            onClick={() => (active ? undefined : onSelect(stage))}
          >
            {leadStageLabels[stage]}
          </Button>
        );
      })}
    </div>
  );
}

/** Score integrado: nota + confiança + principais motivos (specs fase 17, P1). */
function PotentialBlock({ businessId }: { businessId: string }) {
  const summary = useBusinessAuditSummary(businessId);

  if (summary.isLoading) {
    return <Skeleton className="h-40" />;
  }

  const score = summary.data?.latestScore ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Potencial</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {score ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <ScoreBadge level={score.level} score={score.score} />
              <Badge variant="secondary">Confiança {confidenceLabels[score.confidence]}</Badge>
            </div>
            {score.reasons.length > 0 ? (
              <div className="space-y-1.5">
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
    </Card>
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

  const [activeTab, setActiveTab] = useTabParam<LeadTab>("tab", "lead", LEAD_TABS);
  const [potentialValue, setPotentialValue] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
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
  }, [detail.data]);

  function saveField(input: Parameters<typeof updateLead.mutate>[0]["input"]) {
    updateLead.mutate(
      { leadId, input },
      { onError: () => toast.error("Não foi possível salvar a alteração.") },
    );
  }

  function handleStageChange(stage: LeadStage) {
    if (!detail.data) return;
    if (needsMoveConfirmation(detail.data.lead.stage, stage)) {
      setPendingStage(stage);
      return;
    }
    saveField({ stage });
  }

  function confirmStageChange() {
    if (pendingStage) {
      saveField({ stage: pendingStage });
      setPendingStage(null);
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
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <BusinessLogo name={business.name} websiteUrl={business.websiteUrl} className="size-12 shrink-0" />
          <div className="min-w-0 space-y-1">
            <Link
              href={`/businesses/${business.id}`}
              className="truncate text-2xl font-semibold tracking-tight text-foreground hover:underline"
            >
              {business.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {[business.city, business.state].filter(Boolean).join("/")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <StageStepper current={lead.stage} onSelect={handleStageChange} disabled={updateLead.isPending} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LeadTab)}>
          <TabsList>
            <TabsTrigger value="lead">Lead</TabsTrigger>
            <TabsTrigger value="ai">Abordagem com IA</TabsTrigger>
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

          <TabsContent value="ai">
            <AiGenerationsCard businessId={business.id} leadId={lead.id} phone={business.phone} />
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
        open={pendingStage !== null}
        onOpenChange={(open) => !open && setPendingStage(null)}
        title={pendingStage ? `Marcar como ${leadStageLabels[pendingStage].toLowerCase()}?` : ""}
        description="Isso também atualiza o status comercial do lead."
        confirmLabel="Confirmar"
        onConfirm={confirmStageChange}
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
