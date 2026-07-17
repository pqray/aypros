"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { favoriteBusiness, unfavoriteBusiness } from "./api";

type FavoritableList = { items: Array<{ businessId: string; favorited: boolean }> };
type FavoritableSingle = { favorited: boolean };

function isFavoritableList(data: unknown): data is FavoritableList {
  return Boolean(data) && Array.isArray((data as FavoritableList).items);
}

function isFavoritableSingle(data: unknown): data is FavoritableSingle {
  return Boolean(data) && typeof (data as FavoritableSingle).favorited === "boolean";
}

/**
 * Favoriting is cross-cutting: the businesses table, the favorites list, the
 * discovery results and the business detail page all show the same star for
 * the same business. Rather than each feature owning its own toggle (and
 * drifting out of sync), this walks every cached query under the org plus
 * the per-business audit summary and flips `favorited` wherever that
 * businessId appears, so the star updates instantly no matter where it was
 * clicked (specs/14: optimistic update + rollback on error).
 */
export function useToggleFavorite(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ businessId, favorited }: { businessId: string; favorited: boolean }) =>
      favorited ? favoriteBusiness(businessId) : unfavoriteBusiness(businessId),
    onMutate: async ({ businessId, favorited }) => {
      const orgPrefix = ["org", orgId];
      const summaryKey = ["business", businessId, "audit-summary"];

      await queryClient.cancelQueries({ queryKey: orgPrefix });
      await queryClient.cancelQueries({ queryKey: summaryKey });

      const previousLists = queryClient.getQueriesData({ queryKey: orgPrefix });
      for (const [key, data] of previousLists) {
        if (!isFavoritableList(data)) continue;
        queryClient.setQueryData(key, {
          ...data,
          items: data.items.map((item) =>
            item.businessId === businessId ? { ...item, favorited } : item,
          ),
        });
      }

      const previousSummary = queryClient.getQueryData(summaryKey);
      if (isFavoritableSingle(previousSummary)) {
        queryClient.setQueryData(summaryKey, { ...previousSummary, favorited });
      }

      return { previousLists, summaryKey, previousSummary };
    },
    onError: (_error, _vars, context) => {
      for (const [key, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, data);
      }
      if (context?.summaryKey && context.previousSummary !== undefined) {
        queryClient.setQueryData(context.summaryKey, context.previousSummary);
      }
    },
    onSettled: (_data, _error, { businessId }) => {
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "businesses"] });
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "search"] });
      void queryClient.invalidateQueries({ queryKey: ["business", businessId, "audit-summary"] });
    },
  });
}
