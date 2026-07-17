"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
  ScoreBadge,
  cn,
} from "@aypros/ui";
import type { LeadSummary } from "@aypros/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PiClockCountdown, PiDotsSixVertical, PiPhoneCall } from "react-icons/pi";
import { formatRelativeTime } from "@/lib/format";
import { isOverdue } from "../board";
import { LeadDetailLink } from "./lead-detail-link";

const COOLING_LEAD_DAYS = 7;

function formatCurrency(value: number | null): string | null {
  if (value === null) return null;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDueDate(nextActionAt: string): string {
  const date = new Date(nextActionAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isCoolingLead(lastContactAt: string | null): boolean {
  if (!lastContactAt) return true;
  const date = new Date(lastContactAt);
  if (Number.isNaN(date.getTime())) return true;
  return Date.now() - date.getTime() > COOLING_LEAD_DAYS * 24 * 60 * 60 * 1000;
}

function initials(name: string | null): string {
  if (!name) return "--";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function LeadAssigneeAvatar({ lead }: { lead: LeadSummary }) {
  const label = lead.assignedToName ? `Responsavel: ${lead.assignedToName}` : "Sem responsavel";
  return (
    <Avatar className="size-6 border bg-muted text-[10px]" title={label}>
      {lead.assignedToAvatarUrl ? <AvatarImage src={lead.assignedToAvatarUrl} alt="" /> : null}
      <AvatarFallback>{initials(lead.assignedToName)}</AvatarFallback>
    </Avatar>
  );
}

function LeadCardBody({
  lead,
  onPrefetchDetail,
}: {
  lead: LeadSummary;
  onPrefetchDetail?: (leadId: string) => void;
}) {
  const overdue = isOverdue(lead.nextActionAt);
  const cooling = isCoolingLead(lead.lastContactAt);
  const value = formatCurrency(lead.potentialValue);

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <LeadDetailLink
        leadId={lead.id}
        onPrefetch={onPrefetchDetail}
        className="line-clamp-2 text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {lead.businessName}
      </LeadDetailLink>
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
        <LeadAssigneeAvatar lead={lead} />
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
      <p
        className={cn(
          "flex items-center gap-1 text-xs",
          cooling ? "font-medium text-warning" : "text-muted-foreground",
        )}
      >
        <PiPhoneCall aria-hidden />
        {lead.lastContactAt ? `Ultimo contato ${formatRelativeTime(lead.lastContactAt)}` : "Sem contato registrado"}
      </p>
    </div>
  );
}

export function SortableLeadCard({
  lead,
  onPrefetchDetail,
}: {
  lead: LeadSummary;
  onPrefetchDetail?: (leadId: string) => void;
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
      <Card
        className={cn(
          "shadow-none transition-shadow",
          // While dragging, the original stays as a dimmed placeholder; the
          // DragOverlay renders the floating copy.
          isDragging && "border-dashed opacity-40",
        )}
      >
        <CardContent className="flex items-start gap-1 p-3">
          {/*
            A dedicated drag handle — not the whole card — so links and buttons
            inside the card keep working, and keyboard users get an explicit,
            focusable grab point (KeyboardSensor).
          */}
          <button
            type="button"
            aria-label={`Arrastar ${lead.businessName}`}
            className="mt-0.5 shrink-0 cursor-grab touch-none rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <PiDotsSixVertical aria-hidden />
          </button>
          <LeadCardBody lead={lead} onPrefetchDetail={onPrefetchDetail} />
        </CardContent>
      </Card>
    </div>
  );
}

/** Static rendering used by DragOverlay (no sortable wiring — it's a floating copy). */
export function LeadCardPreview({
  lead,
  onPrefetchDetail,
}: {
  lead: LeadSummary;
  onPrefetchDetail?: (leadId: string) => void;
}) {
  return (
    <Card className="rotate-2 scale-[1.03] shadow-xl ring-2 ring-ring">
      <CardContent className="flex items-start gap-2 p-3">
        <LeadCardBody lead={lead} onPrefetchDetail={onPrefetchDetail} />
      </CardContent>
    </Card>
  );
}
