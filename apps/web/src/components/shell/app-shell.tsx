"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { CommandPalette } from "./command-palette";
import { NavigationProgress } from "./navigation-progress";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AppContextError, useAppContext } from "./use-app-context";

export type ShellUser = {
  email: string;
  fullName: string | null;
};

export type ShellOrganization = {
  name: string;
  slug: string;
} | null;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: context, error } = useAppContext();
  const user = context
    ? { email: context.user.email ?? "Conta", fullName: context.profile.full_name }
    : null;
  const organization = context?.organization
    ? { name: context.organization.name, slug: context.organization.slug }
    : null;

  useEffect(() => {
    if (error instanceof AppContextError && error.status === 401) {
      router.replace("/login");
    }
  }, [error, router]);

  useEffect(() => {
    if (context && !context.profile.onboarding_completed_at) {
      router.replace("/onboarding");
    }
  }, [context, router]);

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      {/* useSearchParams exige boundary própria para não segurar o prerender do shell */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Sidebar user={user} organization={organization} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar user={user} organization={organization} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
