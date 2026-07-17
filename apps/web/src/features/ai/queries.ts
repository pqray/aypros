"use client";

import type { AiKind } from "@aypros/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateAi, listAiGenerations } from "./api";

function generationsKey(orgId: string | undefined, businessId: string) {
  return ["org", orgId, "ai-generations", businessId] as const;
}

export function useAiGenerations(orgId: string | undefined, businessId: string) {
  return useQuery({
    queryKey: generationsKey(orgId, businessId),
    queryFn: () => listAiGenerations(businessId),
    enabled: Boolean(orgId && businessId),
    staleTime: 30_000,
  });
}

export function useGenerateAi(orgId: string | undefined, businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (kind: AiKind) => generateAi(businessId, kind),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: generationsKey(orgId, businessId) });
      // The generation also logs an `ai_generated` activity shown in lead timelines.
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "lead"] });
    },
  });
}
