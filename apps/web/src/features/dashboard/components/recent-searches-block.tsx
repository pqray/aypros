import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@aypros/ui";
import Link from "next/link";
import { PiClockCounterClockwise } from "react-icons/pi";
import { formatRelativeTime, searchStatusLabels, searchStatusVariants } from "../labels";
import type { DashboardSearch } from "../schemas";

function searchResultsHref(search: DashboardSearch): string {
  const params = new URLSearchParams({ city: search.city, segment: search.segment });
  if (search.state) {
    params.set("state", search.state);
  }
  params.set("search", search.id);
  return `/discovery?${params.toString()}`;
}

export function RecentSearchesBlock({ searches, now }: { searches: DashboardSearch[]; now?: Date }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Pesquisas recentes</CardTitle>
          <CardDescription>Últimas descobertas da organização.</CardDescription>
        </div>
        {searches.length > 0 ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/searches">Ver todas</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {searches.length === 0 ? (
          <EmptyState
            icon={<PiClockCounterClockwise />}
            title="Nenhuma pesquisa ainda"
            description="Suas pesquisas de empresas por cidade e segmento aparecem aqui."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/discovery">Fazer primeira pesquisa</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {searches.map((search) => (
              <li key={search.id}>
                <Link
                  href={searchResultsHref(search)}
                  className="flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {search.segment} em {search.city}
                      {search.state ? `/${search.state}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {search.totalFound === 1
                        ? "1 empresa encontrada"
                        : `${search.totalFound} empresas encontradas`}
                      {" · "}
                      {formatRelativeTime(search.createdAt, now)}
                    </p>
                  </div>
                  <Badge variant={searchStatusVariants[search.status]}>
                    {searchStatusLabels[search.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
