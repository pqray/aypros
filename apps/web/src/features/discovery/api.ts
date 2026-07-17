import type {
  CreateSearchResponse,
  SearchListResponse,
  SearchResultsResponse,
  SearchSummary,
} from "@aypros/types";
import type { CreateSearchInput } from "@aypros/validation";
import { apiFetch } from "@/lib/api";

export { ApiError } from "@/lib/api";

export function createSearch(input: CreateSearchInput): Promise<CreateSearchResponse> {
  return apiFetch<CreateSearchResponse>("/v1/searches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getSearch(searchId: string): Promise<{ search: SearchSummary }> {
  return apiFetch<{ search: SearchSummary }>(`/v1/searches/${searchId}`);
}

export function listSearches(page: number, pageSize = 10): Promise<SearchListResponse> {
  return apiFetch<SearchListResponse>(`/v1/searches?page=${page}&pageSize=${pageSize}`);
}

export type SearchResultsParams = {
  page: number;
  pageSize: number;
  filter: "all" | "with_site" | "without_site";
  sort: "relevance" | "name" | "rating" | "reviews";
};

export function getSearchResults(
  searchId: string,
  { page, pageSize, filter, sort }: SearchResultsParams,
): Promise<SearchResultsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    filter,
    sort,
  });
  return apiFetch<SearchResultsResponse>(`/v1/searches/${searchId}/results?${params.toString()}`);
}

export function retrySearch(searchId: string): Promise<{ search: SearchSummary }> {
  return apiFetch<{ search: SearchSummary }>(`/v1/searches/${searchId}/retry`, { method: "POST" });
}
