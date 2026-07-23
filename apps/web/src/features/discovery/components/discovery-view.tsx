"use client";

import { PageHeader, toast } from "@aypros/ui";
import type { CreateSearchResponse, SearchResultItem } from "@aypros/types";
import type { CreateSearchInput } from "@aypros/validation";
import type { SearchStatus } from "@aypros/types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useAppContext } from "@/components/shell/use-app-context";
import { useToggleFavorite } from "@/features/favorites/queries";
import { DiscoveryForm } from "./discovery-form";
import { SearchProgress } from "./search-progress";
import { SearchResultsList } from "./search-results-list";
import { isTerminalStatus, useRetrySearch, useSearch, useSearchResults } from "../queries";

const pageSizes = [10, 20, 30] as const;
const filters = ["all", "with_site", "without_site"] as const;
const sorts = ["relevance", "name", "rating", "reviews"] as const;
const views = ["list", "cards"] as const;

type PageSize = (typeof pageSizes)[number];
type ResultsFilter = (typeof filters)[number];
type ResultsSort = (typeof sorts)[number];
type ResultsView = (typeof views)[number];

function parsePositivePage(value: string | null): number {
  const parsed = Number(value ?? "1");
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function parseOption<T extends readonly string[]>(
  value: string | null,
  options: T,
  fallback: T[number],
) {
  return options.includes(value ?? "") ? (value as T[number]) : fallback;
}

function parsePageSize(value: string | null): PageSize {
  const parsed = Number(value ?? "20");
  return pageSizes.includes(parsed as PageSize) ? (parsed as PageSize) : 20;
}

export function DiscoveryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;

  const searchId = searchParams.get("search");
  const page = parsePositivePage(searchParams.get("page"));
  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const filter = parseOption(searchParams.get("filter"), filters, "all") as ResultsFilter;
  const sort = parseOption(searchParams.get("sort"), sorts, "relevance") as ResultsSort;
  const view = parseOption(searchParams.get("view"), views, "list") as ResultsView;

  const searchQuery = useSearch(orgId, searchId);
  const search = searchQuery.data?.search;
  const city = searchParams.get("city") ?? search?.city ?? "";
  const state = searchParams.get("state") ?? search?.state ?? "";
  const segment = searchParams.get("segment") ?? search?.segment ?? "";
  const resultsQuery = useSearchResults(orgId, searchId, search?.status, {
    page,
    pageSize,
    filter,
    sort,
  });
  const retry = useRetrySearch(orgId, searchId);
  const toggleFavorite = useToggleFavorite(orgId);

  // Status (poll de 1.5s) e resultados (poll de 3.5s) são independentes — o
  // status pode virar terminal entre um poll e outro dos resultados, o que
  // interrompe o polling de resultados numa foto desatualizada (às vezes
  // vazia) até um refresh manual da página. Isso força um fetch final assim
  // que o status vira terminal, garantindo a última leva de resultados.
  const refetchResultsRef = useRef(resultsQuery.refetch);
  refetchResultsRef.current = resultsQuery.refetch;
  const previousStatusRef = useRef<{ searchId: string | null; status: SearchStatus | undefined }>({
    searchId: null,
    status: undefined,
  });
  useEffect(() => {
    const previous = previousStatusRef.current;
    const sameSearch = previous.searchId === searchId;
    if (sameSearch && !isTerminalStatus(previous.status) && isTerminalStatus(search?.status)) {
      void refetchResultsRef.current();
    }
    previousStatusRef.current = { searchId, status: search?.status };
  }, [searchId, search?.status]);

  const updateUrl = useCallback(
    (next: {
      city?: string | null;
      state?: string | null;
      segment?: string | null;
      search?: string | null;
      page?: number | null;
      pageSize?: number | null;
      filter?: ResultsFilter | null;
      sort?: ResultsSort | null;
      view?: ResultsView | null;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        const stringValue = value === null || value === undefined ? "" : String(value);
        if (stringValue) {
          params.set(key, stringValue);
        } else {
          params.delete(key);
        }
      }
      if (params.get("page") === "1") params.delete("page");
      if (params.get("pageSize") === "20") params.delete("pageSize");
      if (params.get("filter") === "all") params.delete("filter");
      if (params.get("sort") === "relevance") params.delete("sort");
      if (params.get("view") === "list") params.delete("view");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  function handleCreated(response: CreateSearchResponse, _input: CreateSearchInput) {
    updateUrl({
      search: response.search.id,
      city: null,
      state: null,
      segment: null,
      page: null,
      pageSize: null,
      filter: null,
      sort: null,
      view: null,
    });
  }

  function handleToggleFavorite(item: SearchResultItem) {
    toggleFavorite.mutate(
      { businessId: item.businessId, favorited: !item.favorited },
      { onError: () => toast.error("Não foi possível atualizar o favorito.") },
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Descoberta"
        description="Encontre empresas reais por cidade e segmento."
        className="pb-2"
      />
      <DiscoveryForm
        orgId={orgId}
        defaultValues={{ city, state, segment }}
        onCreated={handleCreated}
      />
      {searchId && search ? (
        <SearchProgress search={search} onRetry={() => retry.mutate()} retrying={retry.isPending} />
      ) : null}
      {searchId ? (
        <SearchResultsList
          results={resultsQuery.data}
          status={search?.status}
          isLoading={resultsQuery.isLoading || searchQuery.isLoading}
          isUpdating={resultsQuery.isPlaceholderData}
          page={page}
          pageSize={pageSize}
          filter={filter}
          sort={sort}
          view={view}
          favoritePendingId={toggleFavorite.isPending ? (toggleFavorite.variables?.businessId ?? null) : null}
          onToggleFavorite={handleToggleFavorite}
          onPageChange={(nextPage) => updateUrl({ page: nextPage > 1 ? nextPage : null })}
          onPageSizeChange={(nextPageSize) =>
            updateUrl({ page: null, pageSize: nextPageSize === 20 ? null : nextPageSize })
          }
          onFilterChange={(nextFilter) =>
            updateUrl({ page: null, filter: nextFilter === "all" ? null : nextFilter })
          }
          onSortChange={(nextSort) =>
            updateUrl({ page: null, sort: nextSort === "relevance" ? null : nextSort })
          }
          onViewChange={(nextView) => updateUrl({ view: nextView === "list" ? null : nextView })}
        />
      ) : null}
    </div>
  );
}
