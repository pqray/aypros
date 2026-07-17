import { Badge } from "@aypros/ui";
import { PiGlobe } from "react-icons/pi";
import type { BusinessListItem } from "@aypros/types";

/** Site status badge — 4 states per specs/11: sem site / social apenas / fora do ar / URL. */
export function WebsiteBadge({
  websiteUrl,
  socialOnly,
  siteDown,
}: Pick<BusinessListItem, "websiteUrl" | "socialOnly" | "siteDown">) {
  if (websiteUrl) {
    if (siteDown) {
      return <Badge variant="destructive">Fora do ar</Badge>;
    }
    return (
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-info hover:underline"
      >
        <PiGlobe aria-hidden />
        Site
      </a>
    );
  }

  if (socialOnly) {
    return <Badge variant="warning">Social apenas</Badge>;
  }

  return <Badge variant="warning">Sem site</Badge>;
}
