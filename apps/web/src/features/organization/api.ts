import type { OrganizationMembersResponse, OrganizationRole } from "@aypros/types";
import { apiFetch } from "@/lib/api";

export function getOrganizationMembers(): Promise<OrganizationMembersResponse> {
  return apiFetch<OrganizationMembersResponse>("/v1/organization/members");
}

export function addOrganizationMember(input: {
  email: string;
  role: Extract<OrganizationRole, "admin" | "member">;
}): Promise<OrganizationMembersResponse> {
  return apiFetch<OrganizationMembersResponse>("/v1/organization/members", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
