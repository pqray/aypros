import type {
  AyhubClientDetail,
  AyhubClientSummary,
  AyhubClientsResponse,
  AyhubContentBlock,
  AyhubDashboardResponse,
  AyhubPayment,
  AyhubPublishSiteResponse,
  AyhubSiteCost,
  AyhubSiteDetail,
  AyhubSiteSummary,
  CreateAyhubClientInput,
  CreateAyhubContentBlockInput,
  CreateAyhubPaymentInput,
  CreateAyhubSiteCostInput,
  CreateAyhubSiteInput,
  CreateAyhubSiteKeyResponse,
  UpdateAyhubClientInput,
  UpdateAyhubSiteInput,
} from "@aypros/types";
import { apiFetch } from "@/lib/api";

export { ApiError } from "@/lib/api";

export function getAyhubClients(): Promise<AyhubClientsResponse> {
  return apiFetch<AyhubClientsResponse>("/v1/ayhub/clients");
}

export function createAyhubClient(input: CreateAyhubClientInput): Promise<AyhubClientSummary> {
  return apiFetch<AyhubClientSummary>("/v1/ayhub/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAyhubClient(id: string): Promise<AyhubClientDetail> {
  return apiFetch<AyhubClientDetail>(`/v1/ayhub/clients/${id}`);
}

export function updateAyhubClient(id: string, input: UpdateAyhubClientInput): Promise<AyhubClientSummary> {
  return apiFetch<AyhubClientSummary>(`/v1/ayhub/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createAyhubSite(clientId: string, input: CreateAyhubSiteInput): Promise<AyhubSiteSummary> {
  return apiFetch<AyhubSiteSummary>(`/v1/ayhub/clients/${clientId}/sites`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAyhubSite(id: string): Promise<AyhubSiteDetail> {
  return apiFetch<AyhubSiteDetail>(`/v1/ayhub/sites/${id}`);
}

export function updateAyhubSite(id: string, input: UpdateAyhubSiteInput): Promise<AyhubSiteSummary> {
  return apiFetch<AyhubSiteSummary>(`/v1/ayhub/sites/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createAyhubSiteKey(siteId: string): Promise<CreateAyhubSiteKeyResponse> {
  return apiFetch<CreateAyhubSiteKeyResponse>(`/v1/ayhub/sites/${siteId}/keys`, { method: "POST" });
}

export async function revokeAyhubSiteKey(siteId: string, keyId: string): Promise<void> {
  await apiFetch<void>(`/v1/ayhub/sites/${siteId}/keys/${keyId}/revoke`, { method: "POST" });
}

export function createAyhubSiteCost(siteId: string, input: CreateAyhubSiteCostInput): Promise<AyhubSiteCost> {
  return apiFetch<AyhubSiteCost>(`/v1/ayhub/sites/${siteId}/costs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteAyhubSiteCost(id: string): Promise<void> {
  await apiFetch<void>(`/v1/ayhub/costs/${id}`, { method: "DELETE" });
}

export function createAyhubContentBlock(siteId: string, input: CreateAyhubContentBlockInput): Promise<AyhubContentBlock> {
  return apiFetch<AyhubContentBlock>(`/v1/ayhub/sites/${siteId}/content-blocks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAyhubContentBlock(id: string, draftValue: unknown): Promise<AyhubContentBlock> {
  return apiFetch<AyhubContentBlock>(`/v1/ayhub/content-blocks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ draftValue }),
  });
}

export function publishAyhubSite(siteId: string): Promise<AyhubPublishSiteResponse> {
  return apiFetch<AyhubPublishSiteResponse>(`/v1/ayhub/sites/${siteId}/publish`, { method: "POST" });
}

export function createAyhubPayment(clientId: string, input: CreateAyhubPaymentInput): Promise<AyhubPayment> {
  return apiFetch<AyhubPayment>(`/v1/ayhub/clients/${clientId}/payments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAyhubDashboard(): Promise<AyhubDashboardResponse> {
  return apiFetch<AyhubDashboardResponse>("/v1/ayhub/dashboard");
}
