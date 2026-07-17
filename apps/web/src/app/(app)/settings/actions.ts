"use server";

import { organizationSchema, profileSchema } from "@aypros/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionState = {
  error?: string;
  success?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, userId: user.id };
}

export async function updateProfileAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = profileSchema.safeParse({
    fullName: getString(formData, "fullName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revise os dados e tente novamente." };
  }

  const { supabase, userId } = await getUserId();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", userId);

  if (error) {
    return { error: "Não foi possível atualizar o perfil." };
  }

  revalidatePath("/settings/profile");
  return { success: "Perfil atualizado." };
}

export async function updateOrganizationAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = organizationSchema.safeParse({
    name: getString(formData, "name"),
  });
  const organizationId = getString(formData, "organizationId");

  if (!parsed.success || !organizationId) {
    return { error: parsed.success ? "Organização invalida." : parsed.error.issues[0]?.message };
  }

  const { supabase } = await getUserId();
  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", organizationId);

  if (error) {
    return { error: "Não foi possível atualizar a organização." };
  }

  revalidatePath("/settings/organization");
  return { success: "Organização atualizada." };
}
