"use client";

import { cn } from "@aypros/ui";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { memo } from "react";
import { leadStageLabels, type PipelineColumn as PipelineColumnData } from "../board";
import { SortableLeadCard } from "./lead-card";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function PipelineColumnComponent({
  column,
  onPrefetchDetail,
  onRemoveLead,
}: {
  column: PipelineColumnData;
  onPrefetchDetail?: (leadId: string) => void;
  onRemoveLead?: (lead: PipelineColumnData["leads"][number]) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.stage });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {leadStageLabels[column.stage]}
          </p>
          <p className="text-xs text-muted-foreground">
            {column.count} {column.count === 1 ? "lead" : "leads"}
            {column.totalValue > 0 ? ` · ${formatCurrency(column.totalValue)}` : ""}
          </p>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-b-lg p-2 transition-colors",
          isOver && "bg-accent/70 ring-2 ring-inset ring-ring/40",
        )}
      >
        <SortableContext items={column.leads.map((lead) => lead.id)} strategy={verticalListSortingStrategy}>
          {column.leads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              onPrefetchDetail={onPrefetchDetail}
              onRemove={onRemoveLead}
            />
          ))}
        </SortableContext>
        {column.leads.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhum lead aqui</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * `groupByStage` sempre devolve um objeto de coluna novo, mesmo pras colunas
 * que não mudaram — comparação rasa do React.memo não ajudaria. `moveLead`
 * preserva a referência de cada lead não afetado, então comparar os arrays
 * `leads` item a item detecta corretamente quando uma coluna é intocada
 * (evita re-render de todo o board a cada `handleDragOver` do drag, specs/09).
 */
export const PipelineColumn = memo(PipelineColumnComponent, (prev, next) => {
  if (prev.onPrefetchDetail !== next.onPrefetchDetail) return false;
  if (prev.onRemoveLead !== next.onRemoveLead) return false;
  if (prev.column.stage !== next.column.stage) return false;
  if (prev.column.count !== next.column.count) return false;
  if (prev.column.totalValue !== next.column.totalValue) return false;
  if (prev.column.leads.length !== next.column.leads.length) return false;
  return prev.column.leads.every((lead, index) => lead === next.column.leads[index]);
});
