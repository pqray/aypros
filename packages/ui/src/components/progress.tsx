import * as React from "react";
import { cn } from "../lib/cn";

/** Barra de progresso determinada (0-100), sem dependências. */
export function Progress({
  value,
  className,
  indicatorClassName,
  "aria-label": ariaLabel,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
  "aria-label"?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-transform duration-300", indicatorClassName)}
        // Largura orientada a dado — translateX evita reflow (mesmo padrão do shadcn).
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </div>
  );
}
