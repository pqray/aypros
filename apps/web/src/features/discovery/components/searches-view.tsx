"use client";

import { Badge, Button, EmptyState, PageHeader, Skeleton } from "@aypros/ui";
import type { SearchSummary } from "@aypros/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PiClockCounterClockwise } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { formatRelativeTime } from "@/lib/format";
import { searchStatusLabels, searchStatusVariants } from "@/lib/search-status";
import { useSearches } from "../queries";

function resultsHref(search: SearchSummary): string {
  const params = new URLSearchParams({ search: search.id });
  return `/discovery?${params.toString()}`;
}

export function SearchesView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;

  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;

  const { data, isLoading } = useSearches(orgId, page);
  const totalPages = data?.totalPages ?? (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1);
  const hasPreviousPage = data?.hasPreviousPage ?? page > 1;
  const hasNextPage = data?.hasNextPage ?? page < totalPages;

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    } else {
      params.delete("page");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pesquisas"
        description="Histórico de pesquisas da organização."
        className="pb-2"
        actions={
          <Button asChild>
            <Link href="/discovery">Nova pesquisa</Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : !data || data.total === 0 ? (
        <EmptyState
          icon={<PiClockCounterClockwise />}
          title="Nenhuma pesquisa ainda"
          description="Suas pesquisas de empresas por cidade e segmento aparecem aqui."
          action={
            <Button asChild variant="outline">
              <Link href="/discovery">Fazer primeira pesquisa</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <ul className="divide-y divide-border rounded-lg border bg-card text-card-foreground">
            {data.items.map((search) => (
              <li key={search.id}>
                <Link
                  href={resultsHref(search)}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {search.segment} em {search.city}
                      {search.state ? `/${search.state}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {search.totalFound === 1
                        ? "1 empresa encontrada"
                        : `${search.totalFound} empresas encontradas`}
                      {" - "}
                      {formatRelativeTime(search.createdAt)}
                    </p>
                    {search.errorMessage ? (
                      <p className="text-xs text-destructive">{search.errorMessage}</p>
                    ) : null}
                  </div>
                  <Badge variant={searchStatusVariants[search.status]}>
                    {searchStatusLabels[search.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Pagina {page} de {totalPages} - {data.total} pesquisas
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasPreviousPage}
                  onClick={() => goToPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasNextPage}
                  onClick={() => goToPage(page + 1)}
                >
                  Proxima
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
