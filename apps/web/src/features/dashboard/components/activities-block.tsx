import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@aypros/ui";
import { PiClock, PiPulse } from "react-icons/pi";
import { activityIcons } from "@/lib/activity";
import { activityLabels, formatRelativeTime } from "../labels";
import type { DashboardActivity } from "../schemas";

function activityDetail(activity: DashboardActivity): string | null {
  const { payload } = activity;
  const businessName = typeof payload.business_name === "string" ? payload.business_name : null;
  const city = typeof payload.city === "string" ? payload.city : null;
  const segment = typeof payload.segment === "string" ? payload.segment : null;

  if (activity.type === "search_created" && city && segment) {
    return `${segment} em ${city}`;
  }

  return businessName;
}

export function ActivitiesBlock({
  activities,
  now,
}: {
  activities: DashboardActivity[];
  now?: Date;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades recentes</CardTitle>
        <CardDescription>O que aconteceu por ultimo na organizacao.</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <EmptyState
            icon={<PiPulse />}
            title="Nenhuma atividade ainda"
            description="Pesquisas, favoritos, leads e notas da sua equipe aparecem aqui."
          />
        ) : (
          <ol className="max-h-96 overflow-y-auto pr-1">
            {activities.map((activity, index) => {
              const detail = activityDetail(activity);
              const Icon = activityIcons[activity.type];
              const isLast = index === activities.length - 1;

              return (
                <li
                  key={activity.id}
                  className="relative grid grid-cols-[2rem_1fr] gap-3 pb-5 last:pb-0"
                >
                  <div className="relative flex justify-center">
                    {!isLast ? (
                      <span className="absolute bottom-0 top-8 w-px bg-border" aria-hidden />
                    ) : null}
                    <span className="relative z-10 flex size-8 items-center justify-center rounded-full border bg-card text-primary shadow-sm">
                      <Icon className="size-4" aria-hidden />
                    </span>
                  </div>
                  <div className="min-w-0 rounded-md border bg-background px-3 py-2.5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {activityLabels[activity.type]}
                        </p>
                        {detail ? (
                          <p className="truncate text-sm text-muted-foreground">{detail}</p>
                        ) : null}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        <PiClock className="size-3.5" aria-hidden />
                        {formatRelativeTime(activity.createdAt, now)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
