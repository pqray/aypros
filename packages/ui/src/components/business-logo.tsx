import * as React from "react";
import { cn } from "../lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

export interface BusinessLogoProps extends React.ComponentPropsWithoutRef<typeof Avatar> {
  name: string;
  websiteUrl?: string | null;
}

// Public, keyless favicon service (no Google Places quota involved). Radix's
// AvatarImage swaps to AvatarFallback automatically when this 404s/fails.
function faviconSrc(websiteUrl: string | null | undefined): string | undefined {
  if (!websiteUrl) return undefined;
  try {
    const { hostname } = new URL(websiteUrl);
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  } catch {
    return undefined;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return last ? `${first[0]}${last[0]}`.toUpperCase() : first.slice(0, 2).toUpperCase();
}

const BusinessLogo = React.forwardRef<React.ElementRef<typeof Avatar>, BusinessLogoProps>(
  ({ name, websiteUrl, className, ...props }, ref) => {
    const src = faviconSrc(websiteUrl);
    return (
      // Decorative: always rendered next to the business name, so it never
      // carries its own accessible name (would otherwise prefix links/buttons
      // with the initials, e.g. "PC Padaria Central").
      <Avatar ref={ref} aria-hidden className={cn("bg-muted", className)} {...props}>
        {src ? <AvatarImage src={src} alt="" /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
    );
  },
);
BusinessLogo.displayName = "BusinessLogo";

export { BusinessLogo };
