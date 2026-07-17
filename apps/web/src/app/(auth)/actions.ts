"use server";

import {
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type LoginInput,
  type ResetPasswordInput,
  type SignupInput,
} from "@aypros/validation";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

const genericAuthError = "Não foi possível concluir. Confira os dados e tente novamente.";

function getString(formData: FormData, key: keyof LoginInput | keyof SignupInput | keyof ResetPasswordInput) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function loginAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: getString(formData, "email"),
    password: getString(formData, "password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? genericAuthError };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: genericAuthError };
  }

  redirect("/dashboard");
}

export async function signupAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: getString(formData, "fullName"),
    email: getString(formData, "email"),
    password: getString(formData, "password"),
    confirmPassword: getString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? genericAuthError };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });

  if (error) {
    return { error: genericAuthError };
  }

  redirect("/onboarding");
}

export async function resetPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    email: getString(formData, "email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? genericAuthError };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: origin ? `${origin}/auth/callback?next=/settings/profile` : undefined,
  });

  if (error) {
    return { error: genericAuthError };
  }

  return { success: "Se o e-mail estiver cadastrado, voce recebera as instrucoes." };
}

export async function googleSignInAction(): Promise<void> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
