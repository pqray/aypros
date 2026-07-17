"use client";

import { Button, EmptyState, PageHeader, Skeleton, toast } from "@aypros/ui";
import type { LeadStage } from "@aypros/types";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PiKanban } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import type { PipelineOwnerFilter } from "../api";
import { useDeleteLead, usePipeline, usePrefetchLead, useUpdateLead } from "../queries";
import { PipelineBoard } from "./pipeline-board";

export function PipelineView() {
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ownerFilter: PipelineOwnerFilter = searchParams.get("owner") === "mine" ? "mine" : "all";
  const pipeline = usePipeline(orgId, ownerFilter);
  const updateLead = useUpdateLead(orgId);
  const deleteLead = useDeleteLead(orgId);
  const prefetchLead = usePrefetchLead(orgId);

  function handleMove(leadId: string, stage: LeadStage, position: number) {
    updateLead.mutate(
      { leadId, input: { stage, position } },
      { onError: () => toast.error("Não foi possível mover o lead.") },
    );
  }

  function handleRemoveLead(leadId: string) {
    deleteLead.mutate(leadId, {
      onSuccess: () => toast.success("Lead removido do pipeline. A empresa continua salva."),
      onError: () => toast.error("Nao foi possivel remover o lead do pipeline."),
    });
  }

  function setOwnerFilter(value: PipelineOwnerFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "mine") {
      params.set("owner", "mine");
    } else {
      params.delete("owner");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const leads = pipeline.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Pipeline" description="Acompanhe seus leads por estagio." className="pb-0" />
        <div className="inline-flex w-fit rounded-md border bg-card p-1">
          <Button
            type="button"
            size="sm"
            variant={ownerFilter === "all" ? "secondary" : "ghost"}
            onClick={() => setOwnerFilter("all")}
          >
            Todos
          </Button>
          <Button
            type="button"
            size="sm"
            variant={ownerFilter === "mine" ? "secondary" : "ghost"}
            onClick={() => setOwnerFilter("mine")}
          >
            Meus
          </Button>
        </div>
      </div>

      {pipeline.isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-72 w-72 shrink-0" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<PiKanban />}
          title="Nenhum lead no pipeline ainda"
          description={
            ownerFilter === "mine"
              ? "Nenhum lead atribuido a voce no momento."
              : "Adicione empresas ao pipeline a partir da listagem de Empresas ou do dashboard."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/businesses">Ver empresas</Link>
            </Button>
          }
        />
      ) : (
        <PipelineBoard
          leads={leads}
          onMove={handleMove}
          onRemoveLead={handleRemoveLead}
          removeLoading={deleteLead.isPending}
          onPrefetchDetail={prefetchLead}
        />
      )}
    </div>
  );
}
