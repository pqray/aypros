"use client";

import { Button, EmptyState, PageHeader, Skeleton, toast } from "@aypros/ui";
import type {
  BusinessListItem,
  BusinessListQuery,
  BusinessSegmentFilter,
  BusinessSortBy,
  BusinessSortDir,
  BusinessWebsiteFilter,
} from "@aypros/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PiBuildings, PiDownloadSimple, PiHeart, PiMagnifyingGlass, PiPlus } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { useCreateLead } from "@/features/pipeline/queries";
import { useBusinessSelectionStore } from "@/stores/business-selection-store";
import { exportBusinessesCsv } from "../api";
import { applyBusinessListQuery, hasActiveFilters, parseBusinessListQuery, PAGE_SIZES } from "../filters";
import {
  useAuditBusiness,
  useBusinessList,
  usePrefetchBusinessAuditSummary,
  useToggleFavorite,
} from "../queries";
import { BatchActionBar } from "./batch-action-bar";
import { BusinessesCards } from "./businesses-cards";
import { BusinessesTable } from "./businesses-table";
import { BusinessesToolbar, type BusinessesViewMode } from "./businesses-toolbar";
import { ManualBusinessDialog } from "./manual-business-dialog";

export function BusinessesView({
  favoritesOnly = false,
  title,
  description,
}: {
  favoritesOnly?: boolean;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  const query: BusinessListQuery = {
    ...parseBusinessListQuery(searchParams),
    favoritesOnly,
  };
  const view: BusinessesViewMode = searchParams.get("view") === "cards" ? "cards" : "list";

  const list = useBusinessList(orgId, query);
  const toggleFavorite = useToggleFavorite(orgId);
  const auditBusiness = useAuditBusiness(orgId);
  const createLead = useCreateLead(orgId);
  const prefetchBusinessDetail = usePrefetchBusinessAuditSummary();

  const selectedIds = useBusinessSelectionStore((state) => state.selectedIds);
  const setMany = useBusinessSelectionStore((state) => state.setMany);
  const clearSelection = useBusinessSelectionStore((state) => state.clear);

  useEffect(() => clearSelection, [clearSelection]);

  const applyQuery = useCallback(
    (next: Partial<BusinessListQuery>) => {
      const params = applyBusinessListQuery(searchParams, next);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  function handleSortChange(sortBy: BusinessSortBy, sortDir: BusinessSortDir) {
    applyQuery({ sortBy, sortDir });
  }

  function handleWebsiteFilterChange(websiteFilter: BusinessWebsiteFilter) {
    applyQuery({ websiteFilter, page: 1 });
  }

  function handleSegmentFilterChange(segment: BusinessSegmentFilter) {
    applyQuery({ segment, page: 1 });
  }

  function handleCityFilterChange(city: string | undefined) {
    applyQuery({ city, page: 1 });
  }

  function handleViewChange(nextView: BusinessesViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextView === "list") {
      params.delete("view");
    } else {
      params.set("view", nextView);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleToggleFavorite(item: BusinessListItem) {
    toggleFavorite.mutate(
      { businessId: item.businessId, favorited: !item.favorited },
      { onError: () => toast.error("Não foi possível atualizar o favorito.") },
    );
  }

  function handleAudit(businessId: string) {
    auditBusiness.mutate(businessId, {
      onSuccess: () => toast.success("Auditoria concluída."),
      onError: () => toast.error("Não foi possível auditar o site."),
    });
  }

  function handleAddToPipeline(businessId: string) {
    createLead.mutate(businessId, {
      onSuccess: (response) => {
        toast.success(response.created ? "Lead adicionado ao pipeline." : "Esta empresa já está no pipeline.");
      },
      onError: () => toast.error("Não foi possível adicionar ao pipeline."),
    });
  }

  async function handleExportAll() {
    try {
      const { page: _page, pageSize: _pageSize, ...filters } = query;
      await exportBusinessesCsv(filters);
    } catch {
      toast.error("Não foi possível exportar a lista.");
    }
  }

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = list.data?.totalPages ?? Math.max(1, Math.ceil(total / (query.pageSize ?? 20)));
  const hasPreviousPage = list.data?.hasPreviousPage ?? (query.page ?? 1) > 1;
  const hasNextPage = list.data?.hasNextPage ?? (query.page ?? 1) < totalPages;
  const selectedInList = items.filter((item) => selectedIds.has(item.businessId));

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        className="pb-2"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!favoritesOnly ? (
              <Button type="button" onClick={() => setManualDialogOpen(true)}>
                <PiPlus aria-hidden />
                Cadastrar empresa
              </Button>
            ) : null}
            {total > 0 ? (
              <Button type="button" variant="outline" onClick={() => void handleExportAll()}>
                <PiDownloadSimple aria-hidden />
                Exportar CSV
              </Button>
            ) : null}
          </div>
        }
      />

      {!favoritesOnly ? (
        <ManualBusinessDialog
          orgId={orgId}
          open={manualDialogOpen}
          onOpenChange={setManualDialogOpen}
        />
      ) : null}

      <BusinessesToolbar
        orgId={orgId}
        query={query}
        onApply={applyQuery}
        view={view}
        onViewChange={handleViewChange}
      />

      {selectedInList.length > 0 ? (
        <BatchActionBar
          orgId={orgId}
          selectedIds={selectedInList.map((item) => item.businessId)}
          onClear={clearSelection}
        />
      ) : null}

      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : total === 0 ? (
        favoritesOnly ? (
          <EmptyState
            icon={<PiHeart />}
            title="Nenhum favorito ainda"
            description="Favorite empresas na listagem para encontrá-las rapidamente aqui."
            action={
              <Button asChild variant="outline">
                <Link href="/businesses">Ver empresas</Link>
              </Button>
            }
          />
        ) : hasActiveFilters(query) ? (
          <EmptyState
            icon={<PiMagnifyingGlass />}
            title="Nenhuma empresa neste filtro"
            description="Ajuste os filtros para ver as demais empresas descobertas."
            action={
              <Button variant="outline" onClick={() => applyQuery({
                websiteFilter: "all",
                minScore: undefined,
                maxScore: undefined,
                minRating: undefined,
                audited: undefined,
                inPipeline: undefined,
                search: undefined,
                segment: "all",
                city: undefined,
              })}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<PiBuildings />}
            title="Nenhuma empresa descoberta ainda"
            description="Faça uma pesquisa para começar a descobrir empresas."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" onClick={() => setManualDialogOpen(true)}>
                  <PiPlus aria-hidden />
                  Cadastrar empresa
                </Button>
                <Button asChild variant="outline">
                  <Link href="/discovery">Fazer pesquisa</Link>
                </Button>
              </div>
            }
          />
        )
      ) : (
        <>
          {view === "list" ? (
            <BusinessesTable
              items={items}
              selectedIds={selectedIds}
              onSelectionChange={setMany}
              favoritePendingId={
                toggleFavorite.isPending ? (toggleFavorite.variables?.businessId ?? null) : null
              }
              onToggleFavorite={handleToggleFavorite}
              auditPendingId={auditBusiness.isPending ? (auditBusiness.variables ?? null) : null}
              onAudit={handleAudit}
              pipelinePendingId={createLead.isPending ? (createLead.variables ?? null) : null}
              onAddToPipeline={handleAddToPipeline}
              onPrefetchDetail={prefetchBusinessDetail}
              sortBy={query.sortBy ?? "name"}
              sortDir={query.sortDir ?? "asc"}
              onSortChange={handleSortChange}
              websiteFilter={query.websiteFilter ?? "all"}
              onWebsiteFilterChange={handleWebsiteFilterChange}
              segmentFilter={query.segment ?? "all"}
              onSegmentFilterChange={handleSegmentFilterChange}
              cityFilter={query.city ?? ""}
              onCityFilterChange={handleCityFilterChange}
            />
          ) : (
            <BusinessesCards
              items={items}
              selectedIds={selectedIds}
              onSelectionChange={setMany}
              favoritePendingId={
                toggleFavorite.isPending ? (toggleFavorite.variables?.businessId ?? null) : null
              }
              onToggleFavorite={handleToggleFavorite}
              auditPendingId={auditBusiness.isPending ? (auditBusiness.variables ?? null) : null}
              onAudit={handleAudit}
              pipelinePendingId={createLead.isPending ? (createLead.variables ?? null) : null}
              onAddToPipeline={handleAddToPipeline}
              onPrefetchDetail={prefetchBusinessDetail}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Página {query.page} de {totalPages} · {total} {total === 1 ? "empresa" : "empresas"}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {PAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={
                      (query.pageSize ?? 20) === size
                        ? "font-medium text-foreground underline"
                        : "hover:text-foreground"
                    }
                    onClick={() => applyQuery({ pageSize: size, page: 1 })}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPreviousPage}
                onClick={() => applyQuery({ page: (query.page ?? 1) - 1 })}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNextPage}
                onClick={() => applyQuery({ page: (query.page ?? 1) + 1 })}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
