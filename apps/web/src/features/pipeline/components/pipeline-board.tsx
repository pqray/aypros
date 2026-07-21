"use client";

import { ConfirmDialog } from "@aypros/ui";
import type { LeadStage, LeadSummary } from "@aypros/types";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useMemo, useRef, useState } from "react";
import { groupByStage, LEAD_STAGES, leadStageLabels, moveLead, needsMoveConfirmation } from "../board";
import { LeadCardPreview } from "./lead-card";
import { LostReasonDialog } from "./lost-reason-dialog";
import { PipelineColumn } from "./pipeline-column";

type PendingMove = {
  leadId: string;
  stage: LeadStage;
  position: number;
  businessName: string;
};

type PendingRemoval = {
  leadId: string;
  businessName: string;
};

const pipelineCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};

export function PipelineBoard({
  leads,
  onMove,
  onRemoveLead,
  removeLoading = false,
  onPrefetchDetail,
}: {
  leads: LeadSummary[];
  onMove: (leadId: string, stage: LeadStage, position: number, lostReason?: string) => void;
  onRemoveLead?: (leadId: string) => void;
  removeLoading?: boolean;
  onPrefetchDetail?: (leadId: string) => void;
}) {
  const [activeLead, setActiveLead] = useState<LeadSummary | null>(null);
  const [previewLeads, setPreviewLeads] = useState<LeadSummary[] | null>(null);
  const previewLeadsRef = useRef<LeadSummary[] | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);

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

  const visibleLeads = previewLeads ?? leads;
  const columns = useMemo(() => groupByStage(visibleLeads), [visibleLeads]);
  const leadsById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);

  function getMoveTarget(items: LeadSummary[], activeId: string, overId: string) {
    const targetColumns = groupByStage(items);
    const isColumnDrop = (LEAD_STAGES as string[]).includes(overId);

    if (isColumnDrop) {
      const stage = overId as LeadStage;
      const targetColumn = targetColumns.find((column) => column.stage === stage);
      return {
        stage,
        position: targetColumn?.leads.filter((lead) => lead.id !== activeId).length ?? 0,
      };
    }

    const overLead = items.find((lead) => lead.id === overId);
    if (!overLead) return null;
    const targetColumn = targetColumns.find((column) => column.stage === overLead.stage);
    const targetIndex = targetColumn?.leads.findIndex((lead) => lead.id === overId) ?? 0;
    return { stage: overLead.stage, position: targetIndex };
  }

  function requestMove(leadId: string, stage: LeadStage, position: number) {
    const lead = leadsById.get(leadId);
    if (!lead) return;
    if (lead.stage === stage && lead.position === position) return;

    if (needsMoveConfirmation(lead.stage, stage)) {
      setPendingMove({ leadId, stage, position, businessName: lead.businessName });
      return;
    }
    onMove(leadId, stage, position);
  }

  function handleDragStart(event: DragStartEvent) {
    const lead = leadsById.get(String(event.active.id));
    setActiveLead(lead ?? null);
    previewLeadsRef.current = null;
    setPreviewLeads(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setPreviewLeads((current) => {
      const items = current ?? leads;
      const activeItem = items.find((lead) => lead.id === activeId);
      if (!activeItem) return current;

      const target = getMoveTarget(items, activeId, overId);
      if (!target) return current;
      if (activeItem.stage === target.stage && activeItem.position === target.position) return current;

      const nextItems = moveLead(items, activeId, target.stage, target.position);
      previewLeadsRef.current = nextItems;
      return nextItems;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const finalPreview = previewLeadsRef.current;
    previewLeadsRef.current = null;
    setPreviewLeads(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const activeLeadData = leadsById.get(activeId);
    if (!activeLeadData) return;

    const previewLead = finalPreview?.find((lead) => lead.id === activeId);
    if (previewLead) {
      requestMove(activeId, previewLead.stage, previewLead.position);
      return;
    }

    const target = getMoveTarget(leads, activeId, String(over.id));
    if (!target) return;
    requestMove(activeId, target.stage, target.position);
  }

  function confirmPendingMove(lostReason?: string) {
    if (!pendingMove) return;
    onMove(pendingMove.leadId, pendingMove.stage, pendingMove.position, lostReason);
    setPendingMove(null);
  }

  // Referência estável — durante o drag, `PipelineBoard` re-renderiza a cada
  // `handleDragOver`; sem `useCallback` isso invalidaria a memoização de
  // `PipelineColumn`/`SortableLeadCard` mesmo em colunas que não mudaram.
  const requestRemove = useCallback((lead: LeadSummary) => {
    setPendingRemoval({ leadId: lead.id, businessName: lead.businessName });
  }, []);

  function confirmPendingRemoval() {
    if (!pendingRemoval) return;
    onRemoveLead?.(pendingRemoval.leadId);
    setPendingRemoval(null);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pipelineCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveLead(null);
          previewLeadsRef.current = null;
          setPreviewLeads(null);
        }}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {columns.map((column) => (
            <PipelineColumn
              key={column.stage}
              column={column}
              onPrefetchDetail={onPrefetchDetail}
              onRemoveLead={onRemoveLead ? requestRemove : undefined}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead ? <LeadCardPreview lead={activeLead} onPrefetchDetail={onPrefetchDetail} /> : null}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={pendingMove !== null && pendingMove.stage !== "lost"}
        onOpenChange={(open) => !open && setPendingMove(null)}
        title={pendingMove ? `Marcar como ${leadStageLabels[pendingMove.stage].toLowerCase()}?` : ""}
        description={
          pendingMove
            ? `"${pendingMove.businessName}" será movido para ${leadStageLabels[pendingMove.stage].toLowerCase()}.`
            : undefined
        }
        confirmLabel="Confirmar"
        onConfirm={() => confirmPendingMove()}
      />

      <LostReasonDialog
        open={pendingMove !== null && pendingMove.stage === "lost"}
        onOpenChange={(open) => !open && setPendingMove(null)}
        onConfirm={(reason) => confirmPendingMove(reason)}
      />

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title="Remover do pipeline?"
        description={
          pendingRemoval
            ? `"${pendingRemoval.businessName}" sai do pipeline, mas a empresa continua salva na sua base. Notas deste lead serao removidas.`
            : undefined
        }
        confirmLabel="Remover"
        destructive
        loading={removeLoading}
        onConfirm={confirmPendingRemoval}
      />
    </>
  );
}
