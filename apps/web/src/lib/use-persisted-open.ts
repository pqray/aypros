"use client";

import { useEffect, useState } from "react";

const STORAGE_PREFIX = "aypros:card-open:";

function readStoredOpen(key: string, defaultOpen: boolean): boolean {
  if (typeof window === "undefined") return defaultOpen;
  const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
  return raw === null ? defaultOpen : raw === "1";
}

/**
 * Preferência de expandir/colapsar um card, por tipo de card (não por registro
 * específico) — abrir/fechar "Potencial" uma vez vale pra todo lead/empresa daqui
 * pra frente. Sempre nasce aberto até o usuário fechar (specs/23).
 */
export function usePersistedOpen(storageKey: string, defaultOpen = true): [boolean, () => void] {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(readStoredOpen(storageKey, defaultOpen));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function toggle() {
    setOpen((previous) => {
      const next = !previous;
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, next ? "1" : "0");
      return next;
    });
  }

  return [open, toggle];
}
