import * as React from "react";
import { cn } from "../lib/cn";
import { BusinessLogo } from "./business-logo";
import { Card, CardContent } from "./card";

export interface BusinessCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Business name — used for the logo's initials fallback, not rendered as text. */
  name: string;
  websiteUrl?: string | null;
  /** The visible title, already wrapped in whatever link the caller's router needs. */
  title: React.ReactNode;
  /** Location/phone line under the title. */
  meta?: React.ReactNode;
  /** Status badges row (site, score, ...), pinned to the bottom of the card. */
  badges?: React.ReactNode;
  /** Top-right slot, e.g. a favorite button. */
  actions?: React.ReactNode;
  /** Slot rendered before the logo, e.g. a selection checkbox. */
  leading?: React.ReactNode;
}

/**
 * Shared card shell for "a business as a tile" — used by both the discovery
 * results grid and the businesses grid so the two stay visually identical.
 * Route-agnostic (specs/15): the caller supplies `title` already linked.
 */
const BusinessCard = React.forwardRef<HTMLDivElement, BusinessCardProps>(
  ({ name, websiteUrl, title, meta, badges, actions, leading, className, ...props }, ref) => (
    <Card ref={ref} className={cn("shadow-none", className)} {...props}>
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex min-w-0 items-start gap-2.5">
          {leading}
          <BusinessLogo name={name} websiteUrl={websiteUrl} className="size-9 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1">
            {title}
            {meta}
          </div>
          {actions}
        </div>
        {badges ? <div className="mt-auto flex flex-wrap items-center gap-3">{badges}</div> : null}
      </CardContent>
    </Card>
  ),
);
BusinessCard.displayName = "BusinessCard";

export { BusinessCard };
