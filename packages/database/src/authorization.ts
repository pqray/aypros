export const memberRoles = ["owner", "admin", "member"] as const;

export type MemberRole = (typeof memberRoles)[number];

export function canManageOrganization(role: MemberRole) {
  return role === "owner" || role === "admin";
}

export function canManageMembers(role: MemberRole) {
  return role === "owner";
}

export function isOrganizationMember(
  memberships: Array<{ organizationId: string; userId: string }>,
  input: { organizationId: string; userId: string },
) {
  return memberships.some(
    (membership) =>
      membership.organizationId === input.organizationId && membership.userId === input.userId,
  );
}
