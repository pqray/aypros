"use client";

import type { SearchStatus } from "@aypros/types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateSearchInput } from "@aypros/validation";
import {
  createSearch,
  getSearch,
  getSearchResults,
  listSearches,
  retrySearch,
  type SearchResultsParams,
} from "./api";

const TERMINAL_STATUSES: SearchStatus[] = ["completed", "partial", "failed"];
const SEARCH_STATUS_POLL_MS = 1500;
const SEARCH_RESULTS_POLL_MS = 3500;

export function isTerminalStatus(status: SearchStatus | undefined): boolean {
  return status !== undefined && TERMINAL_STATUSES.includes(status);
}

export function useSearch(orgId: string | undefined, searchId: string | null) {
  return useQuery({
    queryKey: ["org", orgId, "search", searchId],
    queryFn: () => getSearch(searchId as string),
    enabled: Boolean(orgId && searchId),
    staleTime: 0,
    refetchInterval: (query) =>
      isTerminalStatus(query.state.data?.search.status) ? false : SEARCH_STATUS_POLL_MS,
  });
}

export function useSearchResults(
  orgId: string | undefined,
  searchId: string | null,
  searchStatus: SearchStatus | undefined,
  params: SearchResultsParams,
) {
  return useQuery({
    queryKey: ["org", orgId, "search", searchId, "results", params],
    queryFn: () => getSearchResults(searchId as string, params),
    enabled: Boolean(orgId && searchId),
    // While the search runs, new businesses stream in every poll; keeping the
    // previous page avoids the list blinking between refetches.
    refetchInterval: isTerminalStatus(searchStatus) ? false : SEARCH_RESULTS_POLL_MS,
    placeholderData: keepPreviousData,
  });
}

export function useSearches(orgId: string | undefined, page: number) {
  return useQuery({
    queryKey: ["org", orgId, "searches", { page }],
    queryFn: () => listSearches(page),
    enabled: Boolean(orgId),
    staleTime: 30_000,
  });
}

export function useCreateSearch(orgId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSearchInput) => createSearch(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "searches"] });
    },
  });
}

export function useRetrySearch(orgId: string | undefined, searchId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => retrySearch(searchId as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "search", searchId] });
      void queryClient.invalidateQueries({ queryKey: ["org", orgId, "searches"] });
    },
  });
}
