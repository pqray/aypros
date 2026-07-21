import { Badge, Tooltip, TooltipContent, TooltipTrigger } from "@aypros/ui";
import type { ReactNode } from "react";
import { PiGlobe } from "react-icons/pi";
import { SiInstagram } from "react-icons/si";
import type { BusinessListItem } from "@aypros/types";

type WebsitePresenceProps = Pick<
  BusinessListItem,
  "websiteUrl" | "socialOnly" | "siteDown" | "instagramUrl"
>;

/** Icon-only presence indicators — site e Instagram — per specs/11 (site) e specs/phases/phase-15 (instagram). */
export function WebsiteBadge({ websiteUrl, socialOnly, siteDown, instagramUrl }: WebsitePresenceProps) {
  const hasSite = Boolean(websiteUrl);
  const hasInstagram = Boolean(instagramUrl);

  if (!hasSite && !hasInstagram) {
    return <Badge variant="warning">{socialOnly ? "Social apenas" : "Sem redes sociais"}</Badge>;
  }

  return (
    <div className="flex items-center gap-2">
      {hasSite ? (
        siteDown ? (
          <Badge variant="destructive">Fora do ar</Badge>
        ) : (
          <SiteIcon websiteUrl={websiteUrl as string} />
        )
      ) : (
        <DisabledIcon icon={<PiGlobe className="size-4" aria-hidden />} label="Sem site" />
      )}
      {hasInstagram ? (
        <InstagramIcon instagramUrl={instagramUrl as string} />
      ) : (
        <DisabledIcon icon={<SiInstagram className="size-4" aria-hidden />} label="Instagram não detectado" />
      )}
    </div>
  );
}

function SiteIcon({ websiteUrl }: { websiteUrl: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir site"
          className="inline-flex items-center text-info hover:text-info/80"
        >
          <PiGlobe className="size-4" aria-hidden />
        </a>
      </TooltipTrigger>
      <TooltipContent>Site</TooltipContent>
    </Tooltip>
  );
}

function InstagramIcon({ instagramUrl }: { instagramUrl: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir Instagram"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
        >
          <SiInstagram className="size-4" aria-hidden />
        </a>
      </TooltipTrigger>
      <TooltipContent>Instagram</TooltipContent>
    </Tooltip>
  );
}

function DisabledIcon({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span aria-label={label} className="inline-flex items-center text-muted-foreground/30">
          {icon}
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
