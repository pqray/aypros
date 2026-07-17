import { EmptyState } from "@aypros/ui";
import type { LeadActivity } from "@aypros/types";
import { PiClock, PiPulse } from "react-icons/pi";
import { activityIcons, activityLabels } from "@/lib/activity";
import { formatRelativeTime } from "@/lib/format";

function activityDetail(activity: LeadActivity): string | null {
  if (activity.type === "lead_stage_changed") {
    const fromLabel = activity.payload.from_label;
    const toLabel = activity.payload.to_label;
    if (typeof fromLabel === "string" && typeof toLabel === "string") {
      return `${fromLabel} → ${toLabel}`;
    }
  }
  return null;
}

export function LeadActivityTimeline({ activities }: { activities: LeadActivity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState icon={<PiPulse />} title="Nenhuma atividade ainda" description="O histórico deste lead aparece aqui." />
    );
  }

  return (
    <ol className="max-h-96 space-y-3 overflow-y-auto pr-1">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.type];
        const detail = activityDetail(activity);
        return (
          <li key={activity.id} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card text-primary">
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm text-foreground">{activityLabels[activity.type]}</p>
              {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <PiClock className="size-3" aria-hidden />
                {formatRelativeTime(activity.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
