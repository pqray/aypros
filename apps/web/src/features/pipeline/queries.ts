"use client";

import type {
  CreateLeadContactInput,
  GenerateContactCopilotInput,
  LeadStage,
  LeadStatus,
  PipelineResponse,
  UpdateLeadInput,
} from "@aypros/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ayhubClientsKey, ayhubDashboardKey } from "@/features/ayhub/queries";
import {
  batchCreateLeads,
  createLead,
  createLeadContact,
  createNote,
  deleteLead,
  deleteNote,
  generateContactCopilot,
  getLead,
  getOrganizationMembers,
  getPipeline,
  type PipelineOwnerFilter,
  updateLead,
  updateNote,
} from "./api";
import { moveLead } from "./board";

function pipelineKey(orgId: string | undefined, ownerFilter: PipelineOwnerFilter = "all") {
  return ["org", orgId, "pipeline", ownerFilter] as const;
}

export function leadKey(orgId: string | undefined, leadId: string | undefined) {
  return ["org", orgId, "lead", leadId] as const;
}

export function usePipeline(orgId: string | undefined, ownerFilter: PipelineOwnerFilter = "all") {
  return useQuery({
    queryKey: pipelineKey(orgId, ownerFilter),
    queryFn: () => getPipeline(ownerFilter),
    enabled: Boolean(orgId),
    staleTime: 30_000,
  });
}

export function useOrganizationMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["org", orgId, "members"] as const,
    queryFn: () => getOrganizationMembers(),
    enabled: Boolean(orgId),
    staleTime: 60_000,
  });
}

export function useLead(orgId: string | undefined, leadId: string | undefined) {
  return useQuery({
    queryKey: leadKey(orgId, leadId),
    queryFn: () => getLead(leadId as string),
    enabled: Boolean(orgId && leadId),
    staleTime: 120_000,
  });
}

export function usePrefetchLead(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return (leadId: string) => {
    if (!orgId) return;
    void queryClient.prefetchQuery({
      queryKey: leadKey(orgId, leadId),
      queryFn: () => getLead(leadId),
      staleTime: 120_000,
    });
  };
}

/** Removes a lead from the pipeline (the business itself stays untouched). */
export function useDeleteLead(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadId: string) => deleteLead(leadId),
    onMutate: async (leadId) => {
      await queryClient.cancelQueries({ queryKey: ["org", orgId, "pipeline"] });
      const previous = queryClient.getQueriesData<PipelineResponse>({
        queryKey: ["org", orgId, "pipeline"],
      });
      queryClient.setQueriesData<PipelineResponse>(
        { queryKey: ["org", orgId, "pipeline"] },
        (current) =>
          current ? { items: current.items.filter((lead) => lead.id !== leadId) } : current,
      );
      return { previous };
    },
    onError: (_error, _leadId, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: (_data, _error, leadId) => {
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "pipeline"] });
      queryClient.removeQueries({ queryKey: leadKey(orgId, leadId) });
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "businesses"] });
    },
  });
}

/** Creates a lead for a business (idempotent — reuses the existing one, specs/12). */
export function useCreateLead(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (businessId: string) => createLead(businessId),
    onSuccess: (response) => {
      queryClient.setQueryData(
        ["business", response.lead.businessId, "audit-summary"],
        (current: unknown) =>
          current && typeof current === "object" ? { ...current, leadId: response.lead.id } : current,
      );
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "businesses"] });
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "pipeline"] });
    },
  });
}

export function useBatchCreateLeads(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (businessIds: string[]) => batchCreateLeads(businessIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "businesses"] });
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "pipeline"] });
    },
  });
}

/**
 * Single mutation for both drag-and-drop moves (stage + position) and
 * detail-page field edits. When `stage`+`position` are both present, the
 * optimistic update reindexes the affected column(s) with `moveLead` so the
 * board never "snaps back" visually before the reindexed columns settle.
 */
export function useUpdateLead(orgId: string | undefined) {
  const queryClient = useQueryClient();
  const keyPrefix = ["org", orgId, "pipeline"] as const;

  return useMutation({
    mutationFn: ({ leadId, input }: { leadId: string; input: UpdateLeadInput }) => updateLead(leadId, input),
    onMutate: async ({ leadId, input }) => {
      await queryClient.cancelQueries({ queryKey: keyPrefix });
      const previousEntries = queryClient.getQueriesData<PipelineResponse>({ queryKey: keyPrefix });

      for (const [key, previous] of previousEntries) {
        if (!previous) continue;
        const items =
          input.stage !== undefined && input.position !== undefined
            ? moveLead(previous.items, leadId, input.stage, input.position)
            : previous.items.map((lead) =>
                lead.id === leadId
                  ? {
                      ...lead,
                      ...(input.stage !== undefined ? { stage: input.stage as LeadStage } : {}),
                      ...(input.status !== undefined ? { status: input.status as LeadStatus } : {}),
                      ...(input.potentialValue !== undefined
                        ? { potentialValue: input.potentialValue }
                        : {}),
                      ...(input.nextAction !== undefined ? { nextAction: input.nextAction } : {}),
                      ...(input.nextActionAt !== undefined ? { nextActionAt: input.nextActionAt } : {}),
                      ...(input.assignedTo !== undefined
                        ? { assignedTo: input.assignedTo, assignedToName: null, assignedToAvatarUrl: null }
                        : {}),
                    }
                  : lead,
              );
        queryClient.setQueryData<PipelineResponse>(key, { items });
      }

      return { previousEntries };
    },
    onError: (_error, _vars, context) => {
      for (const [key, previous] of context?.previousEntries ?? []) {
        queryClient.setQueryData(key, previous);
      }
    },
    onSettled: (_data, _error, { leadId, input }) => {
      void queryClient.invalidateQueries({ queryKey: keyPrefix });
      void queryClient.invalidateQueries({ queryKey: leadKey(orgId, leadId) });
      // Entrar em "ganho" cria/localiza um cliente no AYhub server-side (specs/21) —
      // sem mutation própria pra isso aqui, então invalidamos direto pra lista e
      // dashboard do AYhub não ficarem mostrando dado stale até o próximo refetch natural.
      if (input.stage === "won") {
        void queryClient.invalidateQueries({ queryKey: ayhubClientsKey });
        void queryClient.invalidateQueries({ queryKey: ayhubDashboardKey });
      }
    },
  });
}

export function useCreateLeadContact(orgId: string | undefined, leadId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLeadContactInput) => createLeadContact(leadId as string, input),
    onMutate: async () => {
      const key = pipelineKey(orgId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PipelineResponse>(key);
      const optimisticContactAt = new Date().toISOString();

      if (previous && leadId) {
        queryClient.setQueryData<PipelineResponse>(key, {
          items: previous.items.map((lead) =>
            lead.id === leadId ? { ...lead, lastContactAt: optimisticContactAt } : lead,
          ),
        });
      }

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(pipelineKey(orgId), context.previous);
      }
    },
    onSuccess: (response) => {
      queryClient.setQueryData<PipelineResponse>(pipelineKey(orgId), (current) =>
        current
          ? {
              items: current.items.map((lead) =>
                lead.id === response.lead.id
                  ? { ...lead, lastContactAt: response.lead.lastContactAt }
                  : lead,
              ),
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: pipelineKey(orgId) });
      void queryClient.invalidateQueries({ queryKey: leadKey(orgId, leadId) });
    },
  });
}

/** Analisa a conversa relatada e devolve leitura estruturada — nunca altera o lead sozinha (specs/19). */
export function useGenerateContactCopilot(leadId: string) {
  return useMutation({
    mutationFn: (input: GenerateContactCopilotInput) => generateContactCopilot(leadId, input),
  });
}

export function useCreateNote(orgId: string | undefined, leadId: string) {
  const queryClient = useQueryClient();
  const key = leadKey(orgId, leadId);

  return useMutation({
    mutationFn: (content: string) => createNote(leadId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useUpdateNote(orgId: string | undefined, leadId: string) {
  const queryClient = useQueryClient();
  const key = leadKey(orgId, leadId);

  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) => updateNote(noteId, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useDeleteNote(orgId: string | undefined, leadId: string) {
  const queryClient = useQueryClient();
  const key = leadKey(orgId, leadId);

  return useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
