"use client";

import {
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from "@aypros/ui";
import type { BusinessListQuery, SavedFilter } from "@aypros/types";
import { useState } from "react";
import { PiBookmarkSimple, PiPlus, PiTrash } from "react-icons/pi";
import { useDeleteSavedFilter, useSavedFilters } from "../queries";
import { SaveFilterDialog } from "./save-filter-dialog";

export function SavedFiltersMenu({
  orgId,
  currentQuery,
  onApply,
}: {
  orgId: string | undefined;
  currentQuery: BusinessListQuery;
  onApply: (filters: BusinessListQuery) => void;
}) {
  const savedFilters = useSavedFilters(orgId);
  const deleteSavedFilter = useDeleteSavedFilter(orgId);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SavedFilter | null>(null);

  function handleDelete() {
    if (!pendingDelete) return;
    deleteSavedFilter.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success("Filtro removido.");
        setPendingDelete(null);
      },
      onError: () => toast.error("Não foi possível remover o filtro."),
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="gap-2">
            <PiBookmarkSimple aria-hidden />
            Filtros salvos
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onSelect={() => setSaveDialogOpen(true)}>
            <PiPlus aria-hidden />
            Salvar filtro atual
          </DropdownMenuItem>
          {savedFilters.data && savedFilters.data.items.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Meus filtros</DropdownMenuLabel>
              {savedFilters.data.items.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  className="justify-between"
                  onSelect={() => onApply({ ...filter.filters, page: 1 })}
                >
                  <span className="truncate">{filter.name}</span>
                  <button
                    type="button"
                    aria-label={`Remover filtro ${filter.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDelete(filter);
                    }}
                  >
                    <PiTrash aria-hidden />
                  </button>
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveFilterDialog
        orgId={orgId}
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        filters={currentQuery}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remover filtro salvo?"
        description={pendingDelete ? `"${pendingDelete.name}" será removido.` : undefined}
        confirmLabel="Remover"
        destructive
        loading={deleteSavedFilter.isPending}
        onConfirm={handleDelete}
      />
    </>
  );
}
