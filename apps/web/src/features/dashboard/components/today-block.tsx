import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from "@aypros/ui";
import Link from "next/link";
import { PiCalendarCheck, PiClockCountdown } from "react-icons/pi";
import type { DashboardTodayLead } from "../schemas";

function isOverdue(iso: string, now = new Date()) {
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.getTime() < now.getTime();
}

function formatActionDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function TodayBlock({ leads, now }: { leads: DashboardTodayLead[]; now?: Date }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hoje</CardTitle>
        <CardDescription>Proximas acoes vencidas ou para hoje.</CardDescription>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <EmptyState
            icon={<PiCalendarCheck />}
            title="Nada pendente para hoje"
            description="Leads com próxima ação vencida ou marcada para hoje aparecem aqui."
          />
        ) : (
          <ul className="divide-y divide-border">
            {leads.map((lead) => {
              const overdue = isOverdue(lead.nextActionAt, now);
              return (
                <li key={lead.id}>
                  <Link
                    href={`/pipeline/${lead.id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium text-foreground">{lead.businessName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {lead.nextAction ?? "Proxima ação"} - {formatActionDate(lead.nextActionAt)}
                      </p>
                    </div>
                    <Badge variant={overdue ? "destructive" : "secondary"}>
                      <PiClockCountdown aria-hidden />
                      {overdue ? "Vencida" : "Hoje"}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
