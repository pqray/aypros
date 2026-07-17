"use client";

import { Badge } from "@aypros/ui";
import type { BusinessSegment, DetectionState } from "@aypros/types";

type DetectionMap = Record<string, { state?: DetectionState; evidence?: Record<string, unknown> }>;

const segmentLabels: Record<BusinessSegment, string> = {
  restaurant: "Restaurante",
  food_service: "Alimentacao",
  services: "Servicos",
  retail: "Varejo",
  other: "Outro",
};

function isFoodSegment(segment: BusinessSegment): boolean {
  return segment === "restaurant" || segment === "food_service";
}

export function SegmentAuditBadges({
  segment,
  linkInBio,
  deliveryPlatform,
  menuOnline,
  compact = false,
}: {
  segment: BusinessSegment;
  linkInBio: boolean;
  deliveryPlatform: boolean;
  menuOnline: boolean;
  compact?: boolean;
}) {
  return (
    <>
      {!compact ? <Badge variant="muted">{segmentLabels[segment]}</Badge> : null}
      {linkInBio ? <Badge variant="warning">Link-in-bio</Badge> : null}
      {deliveryPlatform ? <Badge variant="info">Delivery</Badge> : null}
      {isFoodSegment(segment) && menuOnline ? <Badge variant="success">Cardápio</Badge> : null}
    </>
  );
}

export function SegmentAuditDetailBadges({
  segment,
  detections,
}: {
  segment: BusinessSegment;
  detections: DetectionMap;
}) {
  const linkInBio = detections.linkInBio?.state === "detected";
  const deliveryPlatform = detections.deliveryPlatform?.state === "detected";
  const menuOnline = detections.menuOnline?.state;

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="muted">{segmentLabels[segment]}</Badge>
      {linkInBio ? <Badge variant="warning">Atende por link-in-bio</Badge> : null}
      {deliveryPlatform ? <Badge variant="info">Plataforma de delivery</Badge> : null}
      {isFoodSegment(segment) && menuOnline === "detected" ? (
        <Badge variant="success">Cardápio online</Badge>
      ) : null}
      {isFoodSegment(segment) && menuOnline === "not_detected" ? (
        <Badge variant="warning">Sem cardápio online</Badge>
      ) : null}
    </div>
  );
}
