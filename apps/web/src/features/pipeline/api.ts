import type {
  BatchCreateLeadResponse,
  CreateLeadContactInput,
  CreateLeadResponse,
  LeadContactResponse,
  LeadDetailResponse,
  LeadNote,
  LeadSummary,
  PipelineResponse,
  UpdateLeadInput,
} from "@aypros/types";
import { apiFetch } from "@/lib/api";
export { getOrganizationMembers } from "@/features/organization/api";

export { ApiError } from "@/lib/api";

export type PipelineOwnerFilter = "all" | "mine";

export function pipelinePath(ownerFilter: PipelineOwnerFilter = "all"): string {
  const params = new URLSearchParams();
  if (ownerFilter === "mine") params.set("assignedTo", "me");
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return `/v1/pipeline${suffix}`;
}

export function getPipeline(ownerFilter: PipelineOwnerFilter = "all"): Promise<PipelineResponse> {
  return apiFetch<PipelineResponse>(pipelinePath(ownerFilter));
}

export function createLead(businessId: string): Promise<CreateLeadResponse> {
  return apiFetch<CreateLeadResponse>("/v1/leads", {
    method: "POST",
    body: JSON.stringify({ businessId }),
  });
}

export function batchCreateLeads(businessIds: string[]): Promise<BatchCreateLeadResponse> {
  return apiFetch<BatchCreateLeadResponse>("/v1/leads/batch", {
    method: "POST",
    body: JSON.stringify({ businessIds }),
  });
}

export function getLead(leadId: string): Promise<LeadDetailResponse> {
  return apiFetch<LeadDetailResponse>(`/v1/leads/${leadId}`);
}

export function updateLead(leadId: string, input: UpdateLeadInput): Promise<LeadSummary> {
  return apiFetch<LeadSummary>(`/v1/leads/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createLeadContact(
  leadId: string,
  input: CreateLeadContactInput,
): Promise<LeadContactResponse> {
  return apiFetch<LeadContactResponse>(`/v1/leads/${leadId}/contacts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createNote(leadId: string, content: string): Promise<LeadNote> {
  return apiFetch<LeadNote>(`/v1/leads/${leadId}/notes`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function updateNote(noteId: string, content: string): Promise<LeadNote> {
  return apiFetch<LeadNote>(`/v1/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export async function deleteNote(noteId: string): Promise<void> {
  await apiFetch<void>(`/v1/notes/${noteId}`, { method: "DELETE" });
}
