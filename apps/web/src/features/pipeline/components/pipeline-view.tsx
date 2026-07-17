"use client";

import { Button, EmptyState, PageHeader, Skeleton, toast } from "@aypros/ui";
import type { LeadStage } from "@aypros/types";
import Link from "next/link";
import { PiKanban } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { usePipeline, useUpdateLead } from "../queries";
import { PipelineBoard } from "./pipeline-board";

export function PipelineView() {
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const pipeline = usePipeline(orgId);
  const updateLead = useUpdateLead(orgId);

  function handleMove(leadId: string, stage: LeadStage, position: number) {
    updateLead.mutate(
      { leadId, input: { stage, position } },
      { onError: () => toast.error("Não foi possível mover o lead.") },
    );
  }

  const leads = pipeline.data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Pipeline" description="Acompanhe seus leads por estágio." className="pb-2" />

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
          description="Adicione empresas ao pipeline a partir da listagem de Empresas ou do dashboard."
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
          movePendingLeadId={updateLead.isPending ? (updateLead.variables?.leadId ?? null) : null}
        />
      )}
    </div>
  );
}
