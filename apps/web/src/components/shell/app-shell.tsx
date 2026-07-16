"use client";

import { cn } from "@aypros/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CommandPalette } from "./command-palette";
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
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar user={user} organization={organization} />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          "lg:pl-16",
        )}
      >
        <Topbar user={user} organization={organization} />
        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
