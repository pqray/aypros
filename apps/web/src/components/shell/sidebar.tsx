"use client";

import { Sheet, SheetContent, SheetDescription, SheetTitle, cn } from "@aypros/ui";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { PiCircleNotch } from "react-icons/pi";
import { useSidebarStore } from "@/stores/sidebar-store";
import type { ShellOrganization, ShellUser } from "./app-shell";
import { isActiveRoute, managementNavItems, primaryNavItems, type ShellNavItem } from "./navigation";

// Labels ficam sempre no DOM em largura natural; a própria animacao de largura da
// sidebar as revela (clip via overflow-hidden). O fade e só para o texto não vazar
// no trilho recolhido — sem delay, senão o nome "chega atrásado".
function labelClasses(expanded: boolean): string {
  return expanded
    ? "opacity-100 transition-opacity duration-150 ease-out"
    : "opacity-0 transition-opacity duration-100 ease-in";
}

/**
 * Feedback imédiato no clique: enquanto o App Router busca a rota, o ícone do
 * item clicado vira spinner (useLinkStatus). Sem isso o clique parece morto
 * até a página nova chegar.
 */
function NavLinkIcon({ icon: Icon }: { icon: ComponentType<{ className?: string }> }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <PiCircleNotch className="size-[18px] shrink-0 animate-spin" aria-hidden />
  ) : (
    <Icon className="size-[18px] shrink-0" aria-hidden />
  );
}

function NavLink({ item, expanded, onNavigate }: { item: ShellNavItem; expanded: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActiveRoute(pathname, item);

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
        <NavLinkIcon icon={item.icon} />
      </span>
      <span
        className={cn("min-w-0 flex-1 overflow-hidden whitespace-nowrap", labelClasses(expanded))}
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
        className={cn(
          "absolute inset-0 flex items-center overflow-hidden whitespace-nowrap px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/50",
          labelClasses(expanded),
        )}
        aria-hidden={!expanded}
      >
        {label}
      </span>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
          expanded ? "opacity-0" : "opacity-100",
        )}
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
  onNavigate,
}: {
  expanded: boolean;
  user: ShellUser | null;
  onNavigate?: () => void;
}) {
  const appName = "Aypros";
  const appInitial = appName.slice(0, 1).toUpperCase();
  const userName = user?.fullName || user?.email || "Carregando";

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-2">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label={appName}
          className="flex w-full min-w-0 items-center"
        >
          <span className="flex w-12 shrink-0 items-center justify-center">
            <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              {appInitial}
            </span>
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-sm font-semibold",
              labelClasses(expanded),
            )}
            aria-hidden={!expanded}
          >
            {appName}
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-hidden px-2 py-3" aria-label="Navegacao principal">
        <div className="mb-2">
          {primaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} expanded={expanded} onNavigate={onNavigate} />
          ))}
        </div>
        <SectionHeading expanded={expanded} label="Gestao" />
        <div className="mb-2">
          {managementNavItems.map((item) => (
            <NavLink key={item.href} item={item} expanded={expanded} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="flex shrink-0 items-center border-t border-sidebar-border px-2 py-3">
        <span className="flex w-12 shrink-0 items-center justify-center">
          <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {userName.slice(0, 1).toUpperCase()}
          </span>
        </span>
        <div
          className={cn("min-w-0 flex-1 overflow-hidden", labelClasses(expanded))}
          aria-hidden={!expanded}
        >
          <p className="truncate text-xs font-medium">{userName}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">{user?.email ?? "Conta"}</p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  user,
  organization: _organization,
}: {
  user: ShellUser | null;
  organization: ShellOrganization;
}) {
  const [expanded, setExpanded] = useState(false);
  const mobileOpen = useSidebarStore((state) => state.mobileOpen);
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen);

  return (
    <>
      {/* Spacer fixo do trilho de icones; a expansão acontece por cima do conteúdo */}
      <div className="hidden w-16 shrink-0 lg:block" aria-hidden />

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
          "fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] lg:block",
          expanded ? "w-64 shadow-2xl" : "w-16 shadow-none",
        )}
        aria-label="Navegacao lateral"
      >
        <SidebarContent expanded={expanded} user={user} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navegacao</SheetTitle>
          <SheetDescription className="sr-only">Menu principal do aplicativo</SheetDescription>
          <SidebarContent
            expanded
            user={user}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
