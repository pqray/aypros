"use client";

import type { BusinessListQuery } from "@aypros/types";
import type { CreateManualBusinessInput } from "@aypros/validation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import {
  batchAuditBusinesses,
  batchFavoriteBusinesses,
  createManualBusiness,
  createSavedFilter,
  deleteSavedFilter,
  generateBusinessBriefing,
  getBusinessAuditSummary,
  getBusinessBriefing,
  getBusinessReport,
  listBusinesses,
  listSavedFilters,
  refreshBusinessData,
  runBusinessAudit,
} from "./api";

// Favoriting is shared across businesses/discovery/detail — see features/favorites.
export { useToggleFavorite } from "../favorites/queries";

export function businessAuditSummaryKey(businessId: string) {
  return ["business", businessId, "audit-summary"] as const;
}

export function useBusinessAuditSummary(businessId: string) {
  return useQuery({
    queryKey: businessAuditSummaryKey(businessId),
    queryFn: () => getBusinessAuditSummary(businessId),
    enabled: Boolean(businessId),
    staleTime: 120_000,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
}

export function usePrefetchBusinessAuditSummary() {
  const queryClient = useQueryClient();

  return (businessId: string) => {
    void queryClient.prefetchQuery({
      queryKey: businessAuditSummaryKey(businessId),
      queryFn: () => getBusinessAuditSummary(businessId),
      staleTime: 120_000,
      retry: false,
    });
  };
}

export function businessReportKey(businessId: string) {
  return ["business", businessId, "report"] as const;
}

export function businessBriefingKey(businessId: string) {
  return ["business", businessId, "briefing"] as const;
}

/** Diagnóstico traduzido (mesma fonte do PDF) para render na UI. */
export function useBusinessReport(businessId: string) {
  return useQuery({
    queryKey: businessReportKey(businessId),
    queryFn: () => getBusinessReport(businessId),
    enabled: Boolean(businessId),
    staleTime: 120_000,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
}

export function useBusinessBriefing(businessId: string) {
  return useQuery({
    queryKey: businessBriefingKey(businessId),
    queryFn: () => getBusinessBriefing(businessId),
    enabled: Boolean(businessId),
    staleTime: 120_000,
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  });
}

export function useGenerateBusinessBriefing(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateBusinessBriefing(businessId),
    onSuccess: (response) => {
      queryClient.setQueryData(businessBriefingKey(businessId), {
        briefing: response.briefing,
        sourceHash: response.briefing.sourceHash,
      });
    },
  });
}

export function useRunBusinessAudit(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => runBusinessAudit(businessId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessAuditSummaryKey(businessId) });
      void queryClient.invalidateQueries({ queryKey: businessReportKey(businessId) });
      void queryClient.invalidateQueries({ queryKey: businessBriefingKey(businessId) });
    },
  });
}

export function useRefreshBusinessData(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => refreshBusinessData(businessId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessAuditSummaryKey(businessId) });
      void queryClient.invalidateQueries({ queryKey: businessReportKey(businessId) });
      void queryClient.invalidateQueries({ queryKey: businessBriefingKey(businessId) });
    },
  });
}

/** Generic audit trigger for lists where the target business changes per click. */
export function useAuditBusiness(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (businessId: string) => runBusinessAudit(businessId),
    onSuccess: (_data, businessId) => {
      void queryClient.invalidateQueries({ queryKey: businessesQueryKeyPrefix(orgId) });
      void queryClient.invalidateQueries({ queryKey: businessAuditSummaryKey(businessId) });
    },
  });
}

export function useBusinessList(orgId: string | undefined, query: BusinessListQuery) {
  return useQuery({
    queryKey: ["org", orgId, "businesses", query],
    queryFn: () => listBusinesses(query),
    enabled: Boolean(orgId),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

function businessesQueryKeyPrefix(orgId: string | undefined) {
  return ["org", orgId, "businesses"] as const;
}

export function useCreateManualBusiness(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateManualBusinessInput) => createManualBusiness(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessesQueryKeyPrefix(orgId) });
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "searches"] });
    },
  });
}

export function useBatchFavorite(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (businessIds: string[]) => batchFavoriteBusinesses(businessIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessesQueryKeyPrefix(orgId) });
    },
  });
}

export function useBatchAudit(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (businessIds: string[]) => batchAuditBusinesses(businessIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessesQueryKeyPrefix(orgId) });
    },
  });
}

export function useSavedFilters(orgId: string | undefined) {
  return useQuery({
    queryKey: ["org", orgId, "saved-filters"],
    queryFn: () => listSavedFilters(),
    enabled: Boolean(orgId),
    staleTime: 5 * 60_000,
  });
}

export function useCreateSavedFilter(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, filters }: { name: string; filters: BusinessListQuery }) =>
      createSavedFilter(name, filters),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "saved-filters"] });
    },
  });
}

export function useDeleteSavedFilter(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSavedFilter(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "saved-filters"] });
    },
  });
}
