import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseAuthCookie } from "@/lib/supabase/cookies";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (hasSupabaseAuthCookie(await cookies())) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
