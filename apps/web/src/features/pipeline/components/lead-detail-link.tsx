"use client";

import { cn } from "@aypros/ui";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PiCircleNotch } from "react-icons/pi";

export function LeadDetailLink({
  leadId,
  children,
  className,
  "aria-label": ariaLabel,
  onPrefetch,
}: {
  leadId: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  onPrefetch?: (leadId: string) => void;
}) {
  const href = `/pipeline/${leadId}`;
  const [navigating, setNavigating] = useState(false);

  function prefetch() {
    onPrefetch?.(leadId);
  }

  return (
    <Link
      href={href}
      prefetch
      aria-busy={navigating}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-sm transition-colors",
        navigating && "text-primary",
        className,
      )}
      onFocus={prefetch}
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
      onClick={() => setNavigating(true)}
    >
      {children}
      {navigating ? (
        <PiCircleNotch className="size-3 shrink-0 animate-spin text-primary" aria-hidden />
      ) : null}
    </Link>
  );
}
