import type { BusinessListItem, BusinessListResponse, SearchResultItem, SearchResultsResponse } from "@aypros/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./api";
import { useToggleFavorite } from "./queries";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof api>("./api");
  return {
    ...actual,
    favoriteBusiness: vi.fn(),
    unfavoriteBusiness: vi.fn(),
  };
});

const favoriteBusinessMock = vi.mocked(api.favoriteBusiness);
const unfavoriteBusinessMock = vi.mocked(api.unfavoriteBusiness);

const businessItem: BusinessListItem = {
  businessId: "b1",
  name: "Padaria Central",
  address: null,
  city: "Fortaleza",
  state: "CE",
  phone: null,
  websiteUrl: null,
  socialOnly: false,
  instagramDetected: false,
  socialLinks: false,
  segment: "other",
  linkInBio: false,
  deliveryPlatform: false,
  menuOnline: false,
  rating: null,
  reviewCount: null,
  categories: [],
  score: null,
  scoreLevel: null,
  audited: false,
  siteDown: false,
  favorited: false,
  leadId: null,
};

const searchResultItem: SearchResultItem = {
  businessId: "b1",
  position: 1,
  name: "Padaria Central",
  address: null,
  city: "Fortaleza",
  state: "CE",
  phone: null,
  websiteUrl: null,
  rating: null,
  reviewCount: null,
  categories: [],
  favorited: false,
};

const businessListResponse: BusinessListResponse = {
  items: [businessItem],
  page: 1,
  pageSize: 20,
  total: 1,
};

const searchResultsResponse: SearchResultsResponse = {
  items: [searchResultItem],
  page: 1,
  pageSize: 20,
  total: 1,
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useToggleFavorite", () => {
  let queryClient: QueryClient;
  const businessesListKey = ["org", "org1", "businesses", { page: 1, pageSize: 20 }];
  const searchResultsKey = ["org", "org1", "search", "s1", "results", { page: 1 }];
  const auditSummaryKey = ["business", "b1", "audit-summary"];

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(businessesListKey, businessListResponse);
    queryClient.setQueryData(searchResultsKey, searchResultsResponse);
    queryClient.setQueryData(auditSummaryKey, { business: { id: "b1" }, favorited: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("marks the business as favorited everywhere it's cached (businesses table, discovery results, detail page)", async () => {
    let resolveFavorite: (value: { businessId: string; favorited: boolean }) => void = () => {};
    favoriteBusinessMock.mockReturnValue(
      new Promise((resolve) => {
        resolveFavorite = resolve;
      }),
    );

    const { result } = renderHook(() => useToggleFavorite("org1"), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ businessId: "b1", favorited: true });
    });

    // onMutate awaits cancelQueries before writing the optimistic cache entry,
    // so the update lands a tick after mutate() is called — poll instead of
    // reading the cache synchronously.
    await waitFor(() => {
      const businesses = queryClient.getQueryData<BusinessListResponse>(businessesListKey);
      const results = queryClient.getQueryData<SearchResultsResponse>(searchResultsKey);
      const summary = queryClient.getQueryData<{ favorited: boolean }>(auditSummaryKey);
      expect(businesses?.items[0]?.favorited).toBe(true);
      expect(results?.items[0]?.favorited).toBe(true);
      expect(summary?.favorited).toBe(true);
    });

    resolveFavorite({ businessId: "b1", favorited: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back every cache entry on error", async () => {
    unfavoriteBusinessMock.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useToggleFavorite("org1"), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate({ businessId: "b1", favorited: false });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const businesses = queryClient.getQueryData<BusinessListResponse>(businessesListKey);
    const results = queryClient.getQueryData<SearchResultsResponse>(searchResultsKey);
    expect(businesses?.items[0]?.favorited).toBe(false);
    expect(results?.items[0]?.favorited).toBe(false);
  });
});
