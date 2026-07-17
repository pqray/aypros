"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@aypros/ui";
import type { BusinessListQuery } from "@aypros/types";
import { useState, type FormEvent } from "react";
import { useCreateSavedFilter } from "../queries";

export function SaveFilterDialog({
  orgId,
  open,
  onOpenChange,
  filters,
}: {
  orgId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: BusinessListQuery;
}) {
  const [name, setName] = useState("");
  const createSavedFilter = useCreateSavedFilter(orgId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    const { page: _page, pageSize: _pageSize, ...filtersToSave } = filters;
    createSavedFilter.mutate(
      { name: name.trim(), filters: filtersToSave },
      {
        onSuccess: () => {
          toast.success("Filtro salvo.");
          setName("");
          onOpenChange(false);
        },
        onError: () => toast.error("Não foi possível salvar o filtro."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Salvar filtro atual</DialogTitle>
            <DialogDescription>Dê um nome para reaplicar essa combinação depois.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="save-filter-name">Nome</Label>
            <Input
              id="save-filter-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Sem site, score alto"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={createSavedFilter.isPending} disabled={!name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
