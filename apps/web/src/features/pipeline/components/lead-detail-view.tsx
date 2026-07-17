"use client";

import {
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
  Skeleton,
  cn,
  toast,
} from "@aypros/ui";
import type { LeadStage, LeadStatus } from "@aypros/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PiArrowLeft, PiClockCountdown, PiWarningCircle } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { AiGenerationsCard } from "@/features/ai/components/ai-generations-card";
import { LEAD_STAGES, isOverdue, leadStageLabels } from "../board";
import { useLead, useUpdateLead } from "../queries";
import { LeadActivityTimeline } from "./lead-activity-timeline";
import { LeadNotes } from "./lead-notes";

const leadStatusLabels: Record<LeadStatus, string> = {
  active: "Ativo",
  won: "Ganho",
  lost: "Perdido",
  archived: "Arquivado",
};

export function LeadDetailView({ leadId }: { leadId: string }) {
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const detail = useLead(orgId, leadId);
  const updateLead = useUpdateLead(orgId);

  const [potentialValue, setPotentialValue] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [pendingStage, setPendingStage] = useState<LeadStage | null>(null);

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
    if ((stage === "won" || stage === "lost") && detail.data.lead.stage !== stage) {
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
        <Button asChild variant="outline">
          <Link href="/pipeline">
            <PiArrowLeft aria-hidden />
            Voltar ao pipeline
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lead-stage">Estágio</Label>
                <Select value={lead.stage} onValueChange={(value) => handleStageChange(value as LeadStage)}>
                  <SelectTrigger id="lead-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {leadStageLabels[stage]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-status">Status</Label>
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
              {lead.score !== null && lead.scoreLevel !== null ? (
                <div className="space-y-2">
                  <Label>Score</Label>
                  <div>
                    <ScoreBadge level={lead.scoreLevel} score={lead.score} />
                  </div>
                </div>
              ) : null}
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
            </CardContent>
          </Card>

          <AiGenerationsCard businessId={business.id} />

          <Card>
            <CardHeader>
              <CardTitle>Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadNotes leadId={leadId} orgId={orgId} notes={notes} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadActivityTimeline activities={activities} />
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={pendingStage !== null}
        onOpenChange={(open) => !open && setPendingStage(null)}
        title={pendingStage ? `Marcar como ${leadStageLabels[pendingStage].toLowerCase()}?` : ""}
        description="Isso também atualiza o status comercial do lead."
        confirmLabel="Confirmar"
        onConfirm={confirmStageChange}
      />
    </div>
  );
}
