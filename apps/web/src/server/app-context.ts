import type { AppContextRow, LoadedAppContext } from "@aypros/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Server Component counterpart of apps/api /v1/app-context (same RPC, same shape).
export async function loadServerAppContext(
  supabase: SupabaseClient,
): Promise<LoadedAppContext | null> {
  const { data, error } = await supabase.rpc("get_app_context").maybeSingle();
  const context = data as AppContextRow | null;

  if (error || !context) {
    return null;
  }

  return {
    user: {
      id: context.user_id,
      email: context.email,
    },
    profile: {
      full_name: context.full_name,
      onboarding_completed_at: context.onboarding_completed_at,
    },
    organization: context.organization_id
      ? {
          id: context.organization_id,
          name: context.organization_name ?? "Organizacao",
          slug: context.organization_slug ?? "",
          role: context.organization_role ?? "member",
        }
      : null,
  };
}
