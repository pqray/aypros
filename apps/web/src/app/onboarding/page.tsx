import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseAuthCookie } from "@/lib/supabase/cookies";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  if (!hasSupabaseAuthCookie(await cookies())) {
    redirect("/login");
  }

  return <OnboardingClient />;
}
