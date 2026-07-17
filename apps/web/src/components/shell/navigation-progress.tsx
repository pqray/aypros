"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Disparado por navegações programáticas (ex.: command palette) que não passam por <a>. */
export const NAVIGATION_START_EVENT = "app:navigation-start";

export function notifyNavigationStart() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
  }
}

function isInternalNavigationClick(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!anchor) return false;
  if (anchor.getAttribute("target") === "_blank") return false;
  if (anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href") ?? "";
  if (!href.startsWith("/")) return false;

  const current = `${window.location.pathname}${window.location.search}`;
  return href !== current;
}

/**
 * Barra fina de progresso no topo durante navegações do App Router. O clique
 * num link interno liga a barra na hora (fase de captura, antes do Next agir);
 * a troca de pathname/search desliga. Cobre sidebar, menus, breadcrumbs e
 * qualquer <a> interno — a paleta de comandos avisa via notifyNavigationStart().
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    setNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (isInternalNavigationClick(event)) {
        setNavigating(true);
      }
    }
    function onManualStart() {
      setNavigating(true);
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener(NAVIGATION_START_EVENT, onManualStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAVIGATION_START_EVENT, onManualStart);
    };
  }, []);

  // Rede à prova de falha: navegação cancelada (erro, mesmo destino resolvido
  // pelo Next sem mudar URL) não pode deixar a barra presa.
  useEffect(() => {
    if (!navigating) return;
    const timeout = setTimeout(() => setNavigating(false), 15_000);
    return () => clearTimeout(timeout);
  }, [navigating]);

  if (!navigating) return null;

  return (
    <div
      role="progressbar"
      aria-label="Carregando página"
      className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-primary/15"
    >
      <div className="animate-nav-progress h-full w-1/3 rounded-r-full bg-primary" />
    </div>
  );
}
