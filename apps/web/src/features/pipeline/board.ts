import type { LeadStage, LeadSummary } from "@aypros/types";

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "in_conversation",
  "proposal_sent",
  "won",
  "lost",
];

export const leadStageLabels: Record<LeadStage, string> = {
  new: "Novo",
  contacted: "Contactado",
  in_conversation: "Em conversa",
  proposal_sent: "Proposta enviada",
  won: "Ganho",
  lost: "Perdido",
};

/** Progressão normal do lead — "lost" fica fora por ser alcançável de qualquer etapa, não só da última. */
const FORWARD_STAGES: LeadStage[] = ["new", "contacted", "in_conversation", "proposal_sent", "won"];

/** Próxima etapa da progressão normal, ou `null` quando a etapa atual já é terminal (won/lost). */
export function nextForwardStage(current: LeadStage): LeadStage | null {
  const index = FORWARD_STAGES.indexOf(current);
  if (index === -1 || index === FORWARD_STAGES.length - 1) return null;
  return FORWARD_STAGES[index + 1] ?? null;
}

export type PipelineColumn = {
  stage: LeadStage;
  leads: LeadSummary[];
  count: number;
  totalValue: number;
};

export function groupByStage(items: LeadSummary[]): PipelineColumn[] {
  return LEAD_STAGES.map((stage) => {
    const leads = items.filter((lead) => lead.stage === stage).sort((a, b) => a.position - b.position);
    return {
      stage,
      leads,
      count: leads.length,
      totalValue: leads.reduce((sum, lead) => sum + (lead.potentialValue ?? 0), 0),
    };
  });
}

/**
 * Moves `leadId` to `nextStage` at `targetIndex`, reindexing the destination
 * column (and the source column, when it differs) the same way the API's
 * `reorderColumn` does server-side — so the optimistic UI matches exactly
 * what gets persisted, and a reload never "jumps".
 */
export function moveLead(
  items: LeadSummary[],
  leadId: string,
  nextStage: LeadStage,
  targetIndex: number,
): LeadSummary[] {
  const moved = items.find((lead) => lead.id === leadId);
  if (!moved) return items;

  const sourceStage = moved.stage;

  const destinationSiblings = items
    .filter((lead) => lead.stage === nextStage && lead.id !== leadId)
    .sort((a, b) => a.position - b.position);
  const clamped = Math.max(0, Math.min(targetIndex, destinationSiblings.length));
  const destinationOrder = [...destinationSiblings];
  destinationOrder.splice(clamped, 0, moved);
  const destinationPositions = new Map(destinationOrder.map((lead, index) => [lead.id, index]));

  const sourcePositions =
    sourceStage === nextStage
      ? destinationPositions
      : new Map(
          items
            .filter((lead) => lead.stage === sourceStage && lead.id !== leadId)
            .sort((a, b) => a.position - b.position)
            .map((lead, index) => [lead.id, index] as const),
        );

  return items.map((lead) => {
    if (lead.id === leadId) {
      return { ...lead, stage: nextStage, position: destinationPositions.get(leadId) ?? 0 };
    }
    const destinationPosition = destinationPositions.get(lead.id);
    if (destinationPosition !== undefined) {
      return { ...lead, position: destinationPosition };
    }
    const sourcePosition = sourcePositions.get(lead.id);
    if (sourcePosition !== undefined) {
      return { ...lead, position: sourcePosition };
    }
    return lead;
  });
}

/**
 * Entering a terminal stage (won/lost) is a business decision, not a board
 * shuffle — it needs explicit confirmation before persisting (specs/12).
 */
export function needsMoveConfirmation(currentStage: LeadStage, nextStage: LeadStage): boolean {
  return (nextStage === "won" || nextStage === "lost") && currentStage !== nextStage;
}

const OVERDUE_GRACE_MS = 0;

export function isOverdue(nextActionAt: string | null, now: Date = new Date()): boolean {
  if (!nextActionAt) return false;
  const due = new Date(nextActionAt).getTime();
  return Number.isFinite(due) && due < now.getTime() - OVERDUE_GRACE_MS;
}
