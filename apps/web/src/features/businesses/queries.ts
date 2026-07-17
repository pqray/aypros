"use client";

import type { BusinessListQuery } from "@aypros/types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  batchAuditBusinesses,
  batchFavoriteBusinesses,
  createSavedFilter,
  deleteSavedFilter,
  getBusinessAuditSummary,
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
  });
}

export function usePrefetchBusinessAuditSummary() {
  const queryClient = useQueryClient();

  return (businessId: string) => {
    void queryClient.prefetchQuery({
      queryKey: businessAuditSummaryKey(businessId),
      queryFn: () => getBusinessAuditSummary(businessId),
      staleTime: 120_000,
    });
  };
}

export function useRunBusinessAudit(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => runBusinessAudit(businessId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessAuditSummaryKey(businessId) });
    },
  });
}

export function useRefreshBusinessData(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => refreshBusinessData(businessId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: businessAuditSummaryKey(businessId) });
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
