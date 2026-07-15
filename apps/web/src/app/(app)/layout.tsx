import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { hasSupabaseAuthCookie } from "@/lib/supabase/cookies";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseAuthCookie(await cookies())) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
