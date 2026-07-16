"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle, cn } from "@aypros/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useSidebarStore } from "@/stores/sidebar-store";
import type { ShellOrganization, ShellUser } from "./app-shell";
import { isActiveRoute, primaryNavItems, secondaryNavItems, type ShellNavItem } from "./navigation";

const EASE = "cubic-bezier(0.32,0.72,0,1)";

// Labels ficam sempre no DOM em largura natural; a propria animacao de largura da
// sidebar as revela, entao icones nunca mudam de posicao — so fade + slide no texto.
function labelStyle(expanded: boolean): React.CSSProperties {
  return {
    opacity: expanded ? 1 : 0,
    transform: expanded ? "translateX(0)" : "translateX(-8px)",
    transition: expanded
      ? `opacity 200ms ease 80ms, transform 300ms ${EASE} 40ms`
      : `opacity 120ms ease, transform 200ms ${EASE}`,
  };
}

function NavLink({ item, expanded, onNavigate }: { item: ShellNavItem; expanded: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActiveRoute(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative my-0.5 flex h-10 items-center rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      {active ? (
        <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full bg-sidebar-primary" aria-hidden />
      ) : null}
      <span className="flex w-12 shrink-0 items-center justify-center">
        <Icon className="size-[18px] shrink-0" aria-hidden />
      </span>
      <span
        className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
        style={labelStyle(expanded)}
        aria-hidden={!expanded}
      >
        {item.label}
      </span>
    </Link>
  );
}

function SectionHeading({ expanded, label }: { expanded: boolean; label: string }) {
  return (
    <div className="relative h-7 shrink-0">
      <span
        className="absolute inset-0 flex items-center overflow-hidden whitespace-nowrap px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/50"
        style={labelStyle(expanded)}
        aria-hidden={!expanded}
      >
        {label}
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ opacity: expanded ? 0 : 1, transition: "opacity 200ms ease" }}
        aria-hidden
      >
        <span className="h-px w-6 bg-sidebar-border" />
      </span>
    </div>
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
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-2">
        <Link href="/dashboard" onClick={onNavigate} aria-label="Aypros" className="flex w-full min-w-0 items-center">
          <span className="flex w-12 shrink-0 items-center justify-center">
            <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              A
            </span>
          </span>
          <span
            className="min-w-0 flex-1 overflow-hidden whitespace-nowrap text-sm font-semibold"
            style={labelStyle(expanded)}
            aria-hidden={!expanded}
          >
            Aypros
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3" aria-label="Navegacao principal">
        <div className="mb-2">
          {primaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} expanded={expanded} onNavigate={onNavigate} />
          ))}
        </div>
        <SectionHeading expanded={expanded} label="Configuracoes" />
        {secondaryNavItems.map((item) => (
          <NavLink key={item.href} item={item} expanded={expanded} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="flex shrink-0 items-center border-t border-sidebar-border px-2 py-3">
        <span className="flex w-12 shrink-0 items-center justify-center">
          <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {(organization?.name ?? user?.email ?? "A").slice(0, 1).toUpperCase()}
          </span>
        </span>
        <div className="min-w-0 flex-1 overflow-hidden" style={labelStyle(expanded)} aria-hidden={!expanded}>
          <p className="truncate text-xs font-medium">{organization?.name ?? "Sem organizacao"}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {user?.fullName || user?.email || "Carregando"}
          </p>
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
      {/* Spacer que empurra o conteudo em sincronia com a sidebar */}
      <div
        className={cn(
          "hidden shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:block",
          expanded ? "w-64" : "w-16",
        )}
        aria-hidden
      />

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
          "fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:block",
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
