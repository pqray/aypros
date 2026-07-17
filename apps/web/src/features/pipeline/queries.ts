"use client";

import type { LeadStage, LeadStatus, PipelineResponse, UpdateLeadInput } from "@aypros/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  batchCreateLeads,
  createLead,
  createNote,
  deleteNote,
  getLead,
  getPipeline,
  updateLead,
  updateNote,
} from "./api";
import { moveLead } from "./board";

function pipelineKey(orgId: string | undefined) {
  return ["org", orgId, "pipeline"] as const;
}

function leadKey(orgId: string | undefined, leadId: string | undefined) {
  return ["org", orgId, "lead", leadId] as const;
}

export function usePipeline(orgId: string | undefined) {
  return useQuery({
    queryKey: pipelineKey(orgId),
    queryFn: () => getPipeline(),
    enabled: Boolean(orgId),
    staleTime: 15_000,
  });
}

export function useLead(orgId: string | undefined, leadId: string | undefined) {
  return useQuery({
    queryKey: leadKey(orgId, leadId),
    queryFn: () => getLead(leadId as string),
    enabled: Boolean(orgId && leadId),
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
      void queryClient.invalidateQueries({ queryKey: pipelineKey(orgId) });
    },
  });
}

export function useBatchCreateLeads(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (businessIds: string[]) => batchCreateLeads(businessIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "businesses"] });
      void queryClient.invalidateQueries({ queryKey: pipelineKey(orgId) });
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
  const key = pipelineKey(orgId);

  return useMutation({
    mutationFn: ({ leadId, input }: { leadId: string; input: UpdateLeadInput }) => updateLead(leadId, input),
    onMutate: async ({ leadId, input }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PipelineResponse>(key);

      if (previous) {
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
                    }
                  : lead,
              );
        queryClient.setQueryData<PipelineResponse>(key, { items });
      }

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: (_data, _error, { leadId }) => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: leadKey(orgId, leadId) });
    },
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
