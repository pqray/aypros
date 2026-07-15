"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PiCaretRight } from "react-icons/pi";
import { routeLabels } from "./navigation";

function labelForSegment(segment: string) {
  if (segment.length === 36 || segment.startsWith("codex-")) {
    return "Detalhe";
  }

  return routeLabels[segment] ?? segment.replaceAll("-", " ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, index) => ({
    label: labelForSegment(segment),
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));

  return (
    <nav className="min-w-0" aria-label="Breadcrumb">
      <ol className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1">
              {index > 0 ? <PiCaretRight className="size-3 shrink-0" aria-hidden /> : null}
              {current ? (
                <span className="truncate font-medium text-foreground" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link className="truncate hover:text-foreground" href={crumb.href}>
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
