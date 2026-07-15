import { describe, expect, it } from "vitest";
import { canManageMembers, canManageOrganization, isOrganizationMember } from "./authorization";

describe("authorization helpers", () => {
  it("allows owners and admins to manage organization settings", () => {
    expect(canManageOrganization("owner")).toBe(true);
    expect(canManageOrganization("admin")).toBe(true);
    expect(canManageOrganization("member")).toBe(false);
  });

  it("allows only owners to manage members", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(false);
    expect(canManageMembers("member")).toBe(false);
  });

  it("checks membership by organization and user", () => {
    const memberships = [{ organizationId: "org-a", userId: "user-a" }];

    expect(isOrganizationMember(memberships, { organizationId: "org-a", userId: "user-a" })).toBe(
      true,
    );
    expect(isOrganizationMember(memberships, { organizationId: "org-b", userId: "user-a" })).toBe(
      false,
    );
  });
});
