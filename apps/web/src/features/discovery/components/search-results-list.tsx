"use client";

import {
  Badge,
  BusinessCard,
  BusinessLogo,
  Button,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  cn,
} from "@aypros/ui";
import type { SearchResultItem, SearchResultsResponse, SearchStatus } from "@aypros/types";
import Link from "next/link";
import {
  PiBuildings,
  PiCircleNotch,
  PiGlobe,
  PiHeart,
  PiHeartFill,
  PiListBullets,
  PiSquaresFour,
  PiStar,
} from "react-icons/pi";

type WebsiteFilter = "all" | "with_site" | "without_site";
type SortOption = "relevance" | "name" | "rating" | "reviews";
type ResultsView = "list" | "cards";
type PageSize = 10 | 20 | 30;

const websiteFilterLabels: Record<WebsiteFilter, string> = {
  all: "Todas",
  with_site: "Com site",
  without_site: "Sem site",
};

const sortLabels: Record<SortOption, string> = {
  relevance: "Relevancia",
  name: "Nome (A-Z)",
  rating: "Melhor avaliação",
  reviews: "Mais avaliações",
};

const pageSizes: PageSize[] = [10, 20, 30];

function hasWebsite(item: SearchResultItem): boolean {
  return Boolean(item.websiteUrl?.trim());
}

function applyWebsiteFilter(items: SearchResultItem[], filter: WebsiteFilter) {
  return items.filter((item) => {
    if (filter === "with_site") return hasWebsite(item);
    if (filter === "without_site") return !hasWebsite(item);
    return true;
  });
}

function BusinessMeta({ item, className }: { item: SearchResultItem; className?: string }) {
  return (
    <p className={cn("truncate text-xs text-muted-foreground", className)}>
      {[item.address ?? [item.city, item.state].filter(Boolean).join("/"), item.phone]
        .filter(Boolean)
        .join(" - ")}
    </p>
  );
}

function BusinessSignals({ item }: { item: SearchResultItem }) {
  return (
    <>
      {item.rating !== null ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <PiStar aria-hidden />
          {item.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          {item.reviewCount !== null ? ` (${item.reviewCount})` : ""}
        </span>
      ) : null}
      {item.websiteUrl ? (
        <a
          href={item.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-info hover:underline"
        >
          <PiGlobe aria-hidden />
          Site
        </a>
      ) : (
        <Badge variant="warning">Sem site</Badge>
      )}
    </>
  );
}

function FavoriteButton({
  item,
  pending,
  onToggle,
}: {
  item: SearchResultItem;
  pending: boolean;
  onToggle: (item: SearchResultItem) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      aria-label={item.favorited ? "Desfavoritar" : "Favoritar"}
      aria-pressed={item.favorited}
      loading={pending}
      onClick={() => onToggle(item)}
    >
      {item.favorited ? (
        <PiHeartFill className="text-destructive" aria-hidden />
      ) : (
        <PiHeart aria-hidden />
      )}
    </Button>
  );
}

export function SearchResultsList({
  results,
  status,
  isLoading,
  isUpdating = false,
  page,
  pageSize,
  filter,
  sort,
  view,
  favoritePendingId = null,
  onPageChange,
  onPageSizeChange,
  onFilterChange,
  onSortChange,
  onViewChange,
  onToggleFavorite,
}: {
  results: SearchResultsResponse | undefined;
  status: SearchStatus | undefined;
  isLoading: boolean;
  isUpdating?: boolean;
  page: number;
  pageSize: PageSize;
  filter: WebsiteFilter;
  sort: SortOption;
  view: ResultsView;
  favoritePendingId?: string | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onFilterChange: (filter: WebsiteFilter) => void;
  onSortChange: (sort: SortOption) => void;
  onViewChange: (view: ResultsView) => void;
  onToggleFavorite: (item: SearchResultItem) => void;
}) {
  const items = applyWebsiteFilter(results?.items ?? [], filter);
  const totalPages = results?.totalPages ?? (results ? Math.max(1, Math.ceil(results.total / results.pageSize)) : 1);
  const hasPreviousPage = results?.hasPreviousPage ?? page > 1;
  const hasNextPage = results?.hasNextPage ?? page < totalPages;
  const firstItem = results && results.total > 0 ? (results.page - 1) * results.pageSize + 1 : 0;
  const lastItem = results ? Math.min(results.page * results.pageSize, results.total) : 0;

  if (isLoading && !results) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    );
  }

  if (!results || (results.total === 0 && filter === "all")) {
    const running = status === "pending" || status === "processing";
    return (
      <EmptyState
        icon={running ? <PiCircleNotch className="animate-spin" /> : <PiBuildings />}
        title={running ? "Procurando empresas..." : "Nenhuma empresa encontrada"}
        description={
          running
            ? "Os resultados aparecem aqui conforme são descobertos."
            : "Tente ajustar a cidade ou o segmento da pesquisa."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-end gap-2">
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="Filtro de site">
            {(Object.keys(websiteFilterLabels) as WebsiteFilter[]).map((option) => (
              <Button
                key={option}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange(option)}
                className={cn(
                  "h-7 px-3",
                  filter === option && "bg-secondary text-secondary-foreground",
                )}
                aria-pressed={filter === option}
              >
                {websiteFilterLabels[option]}
              </Button>
            ))}
          </div>
          <Select value={sort} onValueChange={(value) => onSortChange(value as SortOption)}>
            <SelectTrigger className="h-8 w-44" aria-label="Ordenar por">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {sortLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value) as PageSize)}
          >
            <SelectTrigger className="h-8 w-40" aria-label="Resultados por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="Visualização">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onViewChange("list")}
              className={cn("size-7", view === "list" && "bg-secondary text-secondary-foreground")}
              aria-label="Ver em lista"
              aria-pressed={view === "list"}
            >
              <PiListBullets aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onViewChange("cards")}
              className={cn("size-7", view === "cards" && "bg-secondary text-secondary-foreground")}
              aria-label="Ver em cards"
              aria-pressed={view === "cards"}
            >
              <PiSquaresFour aria-hidden />
            </Button>
          </div>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {results.total === 0
            ? "0 empresas"
            : `${firstItem}-${lastItem} de ${results.total} empresas`}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<PiBuildings />}
          title="Nenhuma empresa neste filtro"
          description="Ajuste o filtro para ver as demais empresas da pesquisa."
        />
      ) : (
        <>
          {isUpdating ? (
            <div
              className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <PiCircleNotch className="animate-spin" aria-hidden />
              Atualizando resultados...
            </div>
          ) : null}
          {view === "list" ? (
            <ul
              className={cn(
                "divide-y divide-border rounded-lg border bg-card text-card-foreground transition-opacity",
                isUpdating && "opacity-60",
              )}
            >
              {items.map((item) => (
                <li key={item.businessId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <BusinessLogo name={item.name} websiteUrl={item.websiteUrl} className="size-8 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      <Link
                        href={`/businesses/${item.businessId}`}
                        className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item.name}
                      </Link>
                    </p>
                    <BusinessMeta item={item} />
                  </div>
                  <BusinessSignals item={item} />
                  <FavoriteButton
                    item={item}
                    pending={favoritePendingId === item.businessId}
                    onToggle={onToggleFavorite}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div
              className={cn(
                "grid gap-3 transition-opacity md:grid-cols-2 xl:grid-cols-3",
                isUpdating && "opacity-60",
              )}
            >
              {items.map((item) => (
                <BusinessCard
                  key={item.businessId}
                  name={item.name}
                  websiteUrl={item.websiteUrl}
                  title={
                    <Link
                      href={`/businesses/${item.businessId}`}
                      className="line-clamp-2 text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.name}
                    </Link>
                  }
                  meta={<BusinessMeta item={item} className="line-clamp-2 whitespace-normal" />}
                  actions={
                    <FavoriteButton
                      item={item}
                      pending={favoritePendingId === item.businessId}
                      onToggle={onToggleFavorite}
                    />
                  }
                  badges={<BusinessSignals item={item} />}
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Pagina {Math.min(page, totalPages)} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPreviousPage || isUpdating}
                onClick={() => onPageChange(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage || isUpdating}
                onClick={() => onPageChange(page + 1)}
              >
                Proxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
