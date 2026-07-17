"use client";

import { cn } from "@aypros/ui";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PiCircleNotch } from "react-icons/pi";

export function BusinessDetailLink({
  businessId,
  children,
  className,
  onPrefetch,
}: {
  businessId: string;
  children: ReactNode;
  className?: string;
  onPrefetch?: (businessId: string) => void;
}) {
  const href = `/businesses/${businessId}`;
  const [navigating, setNavigating] = useState(false);

  function prefetch() {
    onPrefetch?.(businessId);
  }

  return (
    <Link
      href={href}
      prefetch
      aria-busy={navigating}
      className={cn(
        "group/detail-link inline-flex min-w-0 items-center gap-2 rounded-sm transition-colors",
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
