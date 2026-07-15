"use server";

import { onboardingSchema } from "@aypros/validation";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  error?: string;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function completeOnboardingAction(
  _state: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsed = onboardingSchema.safeParse({
    fullName: getString(formData, "fullName"),
    organizationName: getString(formData, "organizationName"),
    professionalRole: getString(formData, "professionalRole") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revise os dados e tente novamente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: parsed.data.fullName,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return { error: "Nao foi possivel atualizar seu perfil." };
  }

  const baseSlug = slugify(parsed.data.organizationName) || "organizacao";
  const slug = `${baseSlug}-${user.id.slice(0, 8)}`;
  const organizationId = crypto.randomUUID();
  const { error: organizationError } = await supabase.from("organizations").insert({
    id: organizationId,
    name: parsed.data.organizationName,
    slug,
    created_by: user.id,
  });

  if (organizationError) {
    return { error: "Nao foi possivel criar a organizacao." };
  }

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: "Nao foi possivel vincular seu usuario a organizacao." };
  }

  const { error: completionError } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (completionError) {
    return { error: "Nao foi possivel finalizar o onboarding." };
  }

  redirect("/dashboard");
}
