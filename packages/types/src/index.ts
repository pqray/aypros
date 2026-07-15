export type OrganizationRole = "owner" | "admin" | "member";

export type AppContextRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  onboarding_completed_at: string | null;
  organization_id: string | null;
  organization_name: string | null;
  organization_slug: string | null;
  organization_role: OrganizationRole | null;
};

export type LoadedAppContext = {
  user: { id: string; email: string | null };
  profile: { full_name: string | null; onboarding_completed_at: string | null };
  organization: {
    id: string;
    name: string;
    slug: string;
    role: OrganizationRole;
  } | null;
};
