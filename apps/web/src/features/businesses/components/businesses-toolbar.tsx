"use client";

import { Button, Input, cn } from "@aypros/ui";
import type { BusinessListQuery } from "@aypros/types";
import { useEffect, useState } from "react";
import { PiListBullets, PiMagnifyingGlass, PiSquaresFour } from "react-icons/pi";
import { BusinessesFiltersSheet } from "./businesses-filters-sheet";
import { SavedFiltersMenu } from "./saved-filters-menu";

export type BusinessesViewMode = "list" | "cards";

export function BusinessesToolbar({
  orgId,
  query,
  onApply,
  view,
  onViewChange,
}: {
  orgId: string | undefined;
  query: BusinessListQuery;
  onApply: (next: Partial<BusinessListQuery>) => void;
  view: BusinessesViewMode;
  onViewChange: (view: BusinessesViewMode) => void;
}) {
  const [search, setSearch] = useState(query.search ?? "");

  useEffect(() => {
    setSearch(query.search ?? "");
  }, [query.search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== (query.search ?? "")) {
        onApply({ search: search || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-debounce on local `search` changes
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <PiMagnifyingGlass
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome"
          className="pl-8"
          aria-label="Buscar empresas por nome"
        />
      </div>

      <BusinessesFiltersSheet query={query} onApply={(next) => onApply({ ...next, page: 1 })} />
      <SavedFiltersMenu
        orgId={orgId}
        currentQuery={query}
        onApply={(filters) => onApply({ ...filters, page: 1 })}
      />

      <div className="ml-auto flex rounded-lg border p-0.5" role="group" aria-label="Visualização">
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
  );
}
