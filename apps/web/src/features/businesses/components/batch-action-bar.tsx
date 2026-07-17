"use client";

import { Button, toast } from "@aypros/ui";
import { PiDownloadSimple, PiHeart, PiKanban, PiMagnifyingGlass, PiX } from "react-icons/pi";
import { useBatchCreateLeads } from "@/features/pipeline/queries";
import { exportBusinessesCsv } from "../api";
import { useBatchAudit, useBatchFavorite } from "../queries";

export function BatchActionBar({
  orgId,
  selectedIds,
  onClear,
}: {
  orgId: string | undefined;
  selectedIds: string[];
  onClear: () => void;
}) {
  const batchFavorite = useBatchFavorite(orgId);
  const batchAudit = useBatchAudit(orgId);
  const batchCreateLeads = useBatchCreateLeads(orgId);

  function handleFavorite() {
    batchFavorite.mutate(selectedIds, {
      onSuccess: (result) => {
        const failed = result.results.filter((item) => !item.ok).length;
        if (failed > 0) {
          toast.warning(`${selectedIds.length - failed} favoritadas, ${failed} falharam.`);
        } else {
          toast.success(`${selectedIds.length} empresas favoritadas.`);
        }
      },
      onError: () => toast.error("Não foi possível favoritar a seleção."),
    });
  }

  function handleAudit() {
    batchAudit.mutate(selectedIds, {
      onSuccess: (result) => {
        const failed = result.results.filter((item) => !item.ok).length;
        if (failed > 0) {
          toast.warning(`${selectedIds.length - failed} auditadas, ${failed} falharam.`);
        } else {
          toast.success(`${selectedIds.length} sites auditados.`);
        }
      },
      onError: () => toast.error("Não foi possível auditar a seleção."),
    });
  }

  function handleAddToPipeline() {
    batchCreateLeads.mutate(selectedIds, {
      onSuccess: (result) => {
        const failed = result.results.filter((item) => !item.ok).length;
        if (failed > 0) {
          toast.warning(`${selectedIds.length - failed} adicionadas ao pipeline, ${failed} falharam.`);
        } else {
          toast.success(`${selectedIds.length} empresas adicionadas ao pipeline.`);
        }
      },
      onError: () => toast.error("Não foi possível adicionar a seleção ao pipeline."),
    });
  }

  async function handleExport() {
    try {
      await exportBusinessesCsv({}, selectedIds);
    } catch {
      toast.error("Não foi possível exportar a seleção.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-secondary px-4 py-2.5 text-secondary-foreground">
      <span className="text-sm font-medium">
        {selectedIds.length} {selectedIds.length === 1 ? "empresa selecionada" : "empresas selecionadas"}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" loading={batchFavorite.isPending} onClick={handleFavorite}>
          <PiHeart aria-hidden />
          Favoritar
        </Button>
        <Button type="button" variant="outline" size="sm" loading={batchAudit.isPending} onClick={handleAudit}>
          <PiMagnifyingGlass aria-hidden />
          Auditar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={batchCreateLeads.isPending}
          onClick={handleAddToPipeline}
        >
          <PiKanban aria-hidden />
          Adicionar ao pipeline
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void handleExport()}>
          <PiDownloadSimple aria-hidden />
          Exportar CSV
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} aria-label="Limpar seleção">
          <PiX aria-hidden />
        </Button>
      </div>
    </div>
  );
}
