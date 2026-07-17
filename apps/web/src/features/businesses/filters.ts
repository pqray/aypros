import type {
  BusinessListQuery,
  BusinessSegmentFilter,
  BusinessSortBy,
  BusinessSortDir,
  BusinessWebsiteFilter,
} from "@aypros/types";

export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;

const WEBSITE_FILTERS: BusinessWebsiteFilter[] = ["all", "with_site", "without_site"];
const SEGMENT_FILTERS: BusinessSegmentFilter[] = [
  "all",
  "restaurant",
  "food_service",
  "services",
  "retail",
  "other",
];
const SORT_BY_OPTIONS: BusinessSortBy[] = ["name", "score", "rating"];
const SORT_DIR_OPTIONS: BusinessSortDir[] = ["asc", "desc"];

function parseOption<T extends string>(value: string | null, options: T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseFloatParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolParam(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function parseTextParam(value: string | null): string | undefined {
  const parsed = value?.trim();
  return parsed || undefined;
}

/** Reads the businesses table state from URL search params (specs/14: URL is the source of truth). */
export function parseBusinessListQuery(searchParams: URLSearchParams): BusinessListQuery {
  const pageValue = Number(searchParams.get("page") ?? "1");
  const pageSizeValue = Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE);

  return {
    page: Number.isInteger(pageValue) && pageValue >= 1 ? pageValue : 1,
    pageSize: PAGE_SIZES.includes(pageSizeValue as (typeof PAGE_SIZES)[number])
      ? pageSizeValue
      : DEFAULT_PAGE_SIZE,
    websiteFilter: parseOption(searchParams.get("websiteFilter"), WEBSITE_FILTERS, "all"),
    segment: parseOption(searchParams.get("segment"), SEGMENT_FILTERS, "all"),
    city: parseTextParam(searchParams.get("city")),
    minScore: parseIntParam(searchParams.get("minScore")),
    maxScore: parseIntParam(searchParams.get("maxScore")),
    minRating: parseFloatParam(searchParams.get("minRating")),
    audited: parseBoolParam(searchParams.get("audited")),
    inPipeline: parseBoolParam(searchParams.get("inPipeline")),
    search: parseTextParam(searchParams.get("search")),
    sortBy: parseOption(searchParams.get("sortBy"), SORT_BY_OPTIONS, "name"),
    sortDir: parseOption(searchParams.get("sortDir"), SORT_DIR_OPTIONS, "asc"),
  };
}

/** Writes a partial query back into URLSearchParams, dropping keys back to their defaults. */
export function applyBusinessListQuery(
  current: URLSearchParams,
  next: Partial<BusinessListQuery>,
): URLSearchParams {
  const params = new URLSearchParams(current);
  const entries = Object.entries(next) as Array<[keyof BusinessListQuery, unknown]>;

  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  if (params.get("page") === "1") params.delete("page");
  if (params.get("pageSize") === String(DEFAULT_PAGE_SIZE)) params.delete("pageSize");
  if (params.get("sortBy") === "name") params.delete("sortBy");
  if (params.get("sortDir") === "asc") params.delete("sortDir");

  return params;
}

export function hasActiveFilters(query: BusinessListQuery): boolean {
  return Boolean(
    (query.websiteFilter && query.websiteFilter !== "all") ||
      (query.segment && query.segment !== "all") ||
      query.city ||
      query.minScore !== undefined ||
      query.maxScore !== undefined ||
      query.minRating !== undefined ||
      query.audited !== undefined ||
      query.inPipeline !== undefined ||
      query.search,
  );
}
