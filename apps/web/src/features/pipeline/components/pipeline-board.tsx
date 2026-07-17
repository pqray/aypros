"use client";

import { ConfirmDialog } from "@aypros/ui";
import type { LeadStage, LeadSummary } from "@aypros/types";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import { groupByStage, LEAD_STAGES, leadStageLabels } from "../board";
import { LeadCardPreview } from "./lead-card";
import { PipelineColumn } from "./pipeline-column";

type PendingMove = {
  leadId: string;
  stage: LeadStage;
  position: number;
  businessName: string;
};

export function PipelineBoard({
  leads,
  onMove,
  movePendingLeadId,
  onPrefetchDetail,
}: {
  leads: LeadSummary[];
  onMove: (leadId: string, stage: LeadStage, position: number) => void;
  movePendingLeadId: string | null;
  onPrefetchDetail?: (leadId: string) => void;
}) {
  const [activeLead, setActiveLead] = useState<LeadSummary | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // dnd-kit's drop-return animation runs via the Web Animations API, so the
  // global `prefers-reduced-motion` CSS rule (specs/03) can't reach it —
  // disable it explicitly for users who asked for less motion.
  const dropAnimation = useMemo(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? null : undefined;
  }, []);

  const columns = groupByStage(leads);
  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));

  function requestMove(leadId: string, stage: LeadStage, position: number) {
    const lead = leadsById.get(leadId);
    if (!lead) return;
    if (lead.stage === stage && lead.position === position) return;

    if ((stage === "won" || stage === "lost") && lead.stage !== stage) {
      setPendingMove({ leadId, stage, position, businessName: lead.businessName });
      return;
    }
    onMove(leadId, stage, position);
  }

  function handleDragStart(event: DragStartEvent) {
    const lead = leadsById.get(String(event.active.id));
    setActiveLead(lead ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeLeadData = leadsById.get(activeId);
    if (!activeLeadData) return;

    const isColumnDrop = (LEAD_STAGES as string[]).includes(overId);
    if (isColumnDrop) {
      const stage = overId as LeadStage;
      const targetColumn = columns.find((column) => column.stage === stage);
      requestMove(activeId, stage, targetColumn?.leads.length ?? 0);
      return;
    }

    const overLead = leadsById.get(overId);
    if (!overLead) return;
    const targetColumn = columns.find((column) => column.stage === overLead.stage);
    const targetIndex = targetColumn?.leads.findIndex((lead) => lead.id === overId) ?? 0;
    requestMove(activeId, overLead.stage, targetIndex);
  }

  function handleMoveFromMenu(leadId: string, stage: LeadStage) {
    const targetColumn = columns.find((column) => column.stage === stage);
    requestMove(leadId, stage, targetColumn?.leads.length ?? 0);
  }

  function confirmPendingMove() {
    if (!pendingMove) return;
    onMove(pendingMove.leadId, pendingMove.stage, pendingMove.position);
    setPendingMove(null);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLead(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <PipelineColumn
              key={column.stage}
              column={column}
              onMove={handleMoveFromMenu}
              movePendingLeadId={movePendingLeadId}
              onPrefetchDetail={onPrefetchDetail}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead ? <LeadCardPreview lead={activeLead} onPrefetchDetail={onPrefetchDetail} /> : null}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={pendingMove !== null}
        onOpenChange={(open) => !open && setPendingMove(null)}
        title={pendingMove ? `Marcar como ${leadStageLabels[pendingMove.stage].toLowerCase()}?` : ""}
        description={
          pendingMove
            ? `"${pendingMove.businessName}" será movido para ${leadStageLabels[pendingMove.stage].toLowerCase()}.`
            : undefined
        }
        confirmLabel="Confirmar"
        onConfirm={confirmPendingMove}
      />
    </>
  );
}
