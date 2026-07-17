import type {
  ApiErrorBody,
  BatchAuditResponse,
  BatchFavoriteResponse,
  BusinessAuditSummaryResponse,
  BusinessBriefingResponse,
  BusinessRefreshResponse,
  BusinessReportResponse,
  BusinessListQuery,
  BusinessListResponse,
  GenerateBusinessBriefingResponse,
  SavedFilter,
  SavedFilterListResponse,
} from "@aypros/types";
import { ApiError, apiFetch, apiUrl } from "@/lib/api";

export { ApiError } from "@/lib/api";

export function getBusinessAuditSummary(businessId: string): Promise<BusinessAuditSummaryResponse> {
  return apiFetch<BusinessAuditSummaryResponse>(`/v1/businesses/${businessId}/audit-summary`);
}

export function runBusinessAudit(businessId: string): Promise<unknown> {
  return apiFetch<unknown>(`/v1/businesses/${businessId}/audit`, {
    method: "POST",
  });
}

export function getBusinessReport(businessId: string): Promise<BusinessReportResponse> {
  return apiFetch<BusinessReportResponse>(`/v1/businesses/${businessId}/report`);
}

export function getBusinessBriefing(businessId: string): Promise<BusinessBriefingResponse> {
  return apiFetch<BusinessBriefingResponse>(`/v1/businesses/${businessId}/briefing`);
}

export function generateBusinessBriefing(businessId: string): Promise<GenerateBusinessBriefingResponse> {
  return apiFetch<GenerateBusinessBriefingResponse>(`/v1/businesses/${businessId}/briefing`, {
    method: "POST",
  });
}

export function refreshBusinessData(businessId: string): Promise<BusinessRefreshResponse> {
  return apiFetch<BusinessRefreshResponse>(`/v1/businesses/${businessId}/refresh`, {
    method: "POST",
  });
}

export function businessListQueryParams(query: BusinessListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.websiteFilter) params.set("websiteFilter", query.websiteFilter);
  if (query.segment) params.set("segment", query.segment);
  if (query.city) params.set("city", query.city);
  if (query.minScore !== undefined) params.set("minScore", String(query.minScore));
  if (query.maxScore !== undefined) params.set("maxScore", String(query.maxScore));
  if (query.minRating !== undefined) params.set("minRating", String(query.minRating));
  if (query.audited !== undefined) params.set("audited", String(query.audited));
  if (query.inPipeline !== undefined) params.set("inPipeline", String(query.inPipeline));
  if (query.favoritesOnly) params.set("favoritesOnly", "true");
  if (query.search) params.set("search", query.search);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  return params;
}

export function listBusinesses(query: BusinessListQuery): Promise<BusinessListResponse> {
  return apiFetch<BusinessListResponse>(`/v1/businesses?${businessListQueryParams(query).toString()}`);
}

export function batchFavoriteBusinesses(businessIds: string[]): Promise<BatchFavoriteResponse> {
  return apiFetch<BatchFavoriteResponse>("/v1/businesses/batch/favorite", {
    method: "POST",
    body: JSON.stringify({ businessIds }),
  });
}

export function batchAuditBusinesses(businessIds: string[]): Promise<BatchAuditResponse> {
  return apiFetch<BatchAuditResponse>("/v1/businesses/batch/audit", {
    method: "POST",
    body: JSON.stringify({ businessIds }),
  });
}

export function listSavedFilters(): Promise<SavedFilterListResponse> {
  return apiFetch<SavedFilterListResponse>("/v1/saved-filters");
}

export function createSavedFilter(name: string, filters: BusinessListQuery): Promise<SavedFilter> {
  return apiFetch<SavedFilter>("/v1/saved-filters", {
    method: "POST",
    body: JSON.stringify({ name, filters }),
  });
}

export async function deleteSavedFilter(id: string): Promise<void> {
  await apiFetch<void>(`/v1/saved-filters/${id}`, { method: "DELETE" });
}

/** Triggers a browser download of the filtered/selected businesses as CSV. */
export async function exportBusinessesCsv(
  query: Omit<BusinessListQuery, "page" | "pageSize">,
  businessIds?: string[],
): Promise<void> {
  const params = businessListQueryParams(query);
  if (businessIds && businessIds.length > 0) {
    params.set("businessIds", businessIds.join(","));
  }

  const response = await fetch(`${apiUrl}/v1/businesses/export.csv?${params.toString()}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => ({ error: "Erro inesperado" }))) as ApiErrorBody;
    throw new ApiError(response.status, body);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "empresas.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadBusinessReportPdf(businessId: string, businessName: string): Promise<void> {
  const response = await fetch(`${apiUrl}/v1/businesses/${businessId}/report.pdf`, {
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => ({ error: "Erro inesperado" }))) as ApiErrorBody;
    throw new ApiError(response.status, body);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = businessName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  link.download = `diagnostico-${safeName || "empresa"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
