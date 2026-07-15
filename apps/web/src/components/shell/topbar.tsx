"use client";

import { Button } from "@aypros/ui";
import { PiList, PiMagnifyingGlass } from "react-icons/pi";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import type { ShellOrganization, ShellUser } from "./app-shell";
import { Breadcrumbs } from "./breadcrumbs";
import { UserMenu } from "./user-menu";

export function Topbar({
  user,
  organization,
}: {
  user: ShellUser | null;
  organization: ShellOrganization;
}) {
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen);
  const setCommandOpen = useCommandPaletteStore((state) => state.setOpen);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Abrir navegação"
        onClick={() => setMobileOpen(true)}
      >
        <PiList aria-hidden />
      </Button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
        {organization ? (
          <p className="truncate text-xs text-muted-foreground lg:hidden">{organization.name}</p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        className="hidden h-9 min-w-44 justify-between gap-3 text-muted-foreground md:flex"
        onClick={() => setCommandOpen(true)}
      >
        <span className="flex items-center gap-2">
          <PiMagnifyingGlass aria-hidden />
          Buscar comando
        </span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[11px] font-medium">Ctrl K</kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Abrir comandos"
        onClick={() => setCommandOpen(true)}
      >
        <PiMagnifyingGlass aria-hidden />
      </Button>
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  );
}
