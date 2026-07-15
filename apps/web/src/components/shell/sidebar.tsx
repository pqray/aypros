"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@aypros/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSidebarStore } from "@/stores/sidebar-store";
import type { ShellOrganization, ShellUser } from "./app-shell";
import { isActiveRoute, primaryNavItems, secondaryNavItems, type ShellNavItem } from "./navigation";

function labelClass(expanded: boolean) {
  return cn(
    "min-w-0 truncate transition-[opacity,transform] duration-150",
    expanded ? "translate-x-0 opacity-100 delay-75" : "-translate-x-1 opacity-0",
  );
}

function NavLink({ item, expanded, onNavigate }: { item: ShellNavItem; expanded: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActiveRoute(pathname, item);
  const Icon = item.icon;
  const content = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-label={item.label}
      className={cn(
        "grid h-9 grid-cols-[2rem_minmax(0,1fr)] items-center rounded-md pl-1.5 pr-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className="flex size-8 items-center justify-center">
        <Icon className="size-4 shrink-0" aria-hidden />
      </span>
      <span className={labelClass(expanded)} aria-hidden={!expanded}>
        {item.label}
      </span>
    </Link>
  );

  if (expanded) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarContent({
  expanded,
  user,
  organization,
  onNavigate,
}: {
  expanded: boolean;
  user: ShellUser | null;
  organization: ShellOrganization;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label="Aypros"
          className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            A
          </span>
          <span className={cn("text-sm font-semibold", labelClass(expanded))} aria-hidden={!expanded}>
            Aypros
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Navegacao principal">
        <div className="space-y-1">
          {primaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} expanded={expanded} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="space-y-1">
          <p
            className={cn(
              "px-3 text-xs font-medium text-sidebar-foreground/55",
              labelClass(expanded),
            )}
            aria-hidden={!expanded}
          >
            Configuracoes
          </p>
          {secondaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} expanded={expanded} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="relative h-10 rounded-md">
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
              expanded ? "opacity-0" : "opacity-100 delay-75",
            )}
            aria-hidden
          >
            <span className="text-xs font-semibold">
              {(organization?.name ?? user?.email ?? "A").slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div
            className={cn(
              "absolute inset-0 px-3 py-1 transition-[opacity,transform] duration-150",
              expanded ? "translate-x-0 opacity-100 delay-75" : "-translate-x-1 opacity-0",
            )}
            aria-hidden={!expanded}
          >
            <p className="truncate text-xs font-medium">{organization?.name ?? "Sem organizacao"}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {user?.fullName || user?.email || "Carregando"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ user, organization }: { user: ShellUser | null; organization: ShellOrganization }) {
  const [expanded, setExpanded] = useState(false);
  const mobileOpen = useSidebarStore((state) => state.mobileOpen);
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen);

  return (
    <>
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setExpanded(false);
          }
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-sidebar-border bg-sidebar transition-[box-shadow,width] duration-200 ease-out lg:block",
          expanded ? "w-64 shadow-xl" : "w-16 shadow-none",
        )}
        aria-label="Navegacao lateral"
      >
        <SidebarContent expanded={expanded} user={user} organization={organization} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navegacao</SheetTitle>
          <SheetDescription className="sr-only">Menu principal do aplicativo</SheetDescription>
          <SidebarContent
            expanded
            user={user}
            organization={organization}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
