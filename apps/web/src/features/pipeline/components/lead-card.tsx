"use client";

import {
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ScoreBadge,
  cn,
} from "@aypros/ui";
import type { LeadStage, LeadSummary } from "@aypros/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { PiClockCountdown, PiDotsSixVertical, PiDotsThreeVertical } from "react-icons/pi";
import { LEAD_STAGES, isOverdue, leadStageLabels } from "../board";

function formatCurrency(value: number | null): string | null {
  if (value === null) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDueDate(nextActionAt: string): string {
  const date = new Date(nextActionAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function MoveLeadMenu({
  lead,
  onMove,
  disabled,
}: {
  lead: LeadSummary;
  onMove: (leadId: string, stage: LeadStage) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Mover ${lead.businessName}`}
          disabled={disabled}
          className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <PiDotsThreeVertical aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mover para</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LEAD_STAGES.filter((stage) => stage !== lead.stage).map((stage) => (
          <DropdownMenuItem key={stage} onSelect={() => onMove(lead.id, stage)}>
            {leadStageLabels[stage]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LeadCardBody({ lead }: { lead: LeadSummary }) {
  const overdue = isOverdue(lead.nextActionAt);
  const value = formatCurrency(lead.potentialValue);

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <Link
        href={`/pipeline/${lead.id}`}
        className="line-clamp-2 text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {lead.businessName}
      </Link>
      {lead.city ? (
        <p className="truncate text-xs text-muted-foreground">
          {lead.city}
          {lead.state ? `/${lead.state}` : ""}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {lead.score !== null && lead.scoreLevel !== null ? (
          <ScoreBadge level={lead.scoreLevel} score={lead.score} />
        ) : null}
        {value ? <span className="text-xs font-medium text-foreground">{value}</span> : null}
      </div>
      {lead.nextActionAt ? (
        <p
          className={cn(
            "flex items-center gap-1 text-xs",
            overdue ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          <PiClockCountdown aria-hidden />
          {lead.nextAction ? `${lead.nextAction} · ` : ""}
          {formatDueDate(lead.nextActionAt)}
        </p>
      ) : null}
    </div>
  );
}

export function SortableLeadCard({
  lead,
  onMove,
  movePending,
}: {
  lead: LeadSummary;
  onMove: (leadId: string, stage: LeadStage) => void;
  movePending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { stage: lead.stage },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn("shadow-none", isDragging && "opacity-50 ring-2 ring-ring")}>
        <CardContent className="flex items-start gap-1 p-3">
          {/*
            A dedicated drag handle — not the whole card — because dnd-kit's
            drag listeners on an ancestor still intercept clicks from Radix's
            portaled DropdownMenu: React re-dispatches portal events through
            the React tree (not the DOM tree), so they'd bubble into the
            listeners here and swallow the menu-item click.
          */}
          <button
            type="button"
            aria-label={`Arrastar ${lead.businessName}`}
            className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <PiDotsSixVertical aria-hidden />
          </button>
          <LeadCardBody lead={lead} />
          <MoveLeadMenu lead={lead} onMove={onMove} disabled={movePending} />
        </CardContent>
      </Card>
    </div>
  );
}

/** Static rendering used by DragOverlay (no sortable wiring — it's a floating copy). */
export function LeadCardPreview({ lead }: { lead: LeadSummary }) {
  return (
    <Card className="shadow-lg ring-2 ring-ring">
      <CardContent className="flex items-start gap-2 p-3">
        <LeadCardBody lead={lead} />
      </CardContent>
    </Card>
  );
}
