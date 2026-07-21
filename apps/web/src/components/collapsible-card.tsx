"use client";

import { Card, CardHeader, CardTitle, cn } from "@aypros/ui";
import type { ReactNode } from "react";
import { PiCaretDown } from "react-icons/pi";
import { usePersistedOpen } from "@/lib/use-persisted-open";

/**
 * Card colapsável com preferência lembrada por tipo de card (specs/23) — nasce
 * aberto, e o usuário decide o que fica fechado dali em diante. `children` deve
 * incluir o próprio `<CardContent>` (não é injetado aqui) pra manter o layout
 * interno de cada card sob controle de quem chama.
 */
export function CollapsibleCard({
  storageKey,
  title,
  description,
  headerActions,
  defaultOpen = true,
  children,
}: {
  storageKey: string;
  title: string;
  description?: string;
  headerActions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, toggle] = usePersistedOpen(storageKey, defaultOpen);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-w-0 items-start gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PiCaretDown
            aria-hidden
            className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
          />
          <span className="min-w-0">
            <CardTitle>{title}</CardTitle>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </span>
        </button>
        {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
      </CardHeader>
      {open ? children : null}
    </Card>
  );
}
