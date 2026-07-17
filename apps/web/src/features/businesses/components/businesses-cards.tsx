"use client";

import {
  BusinessCard,
  Button,
  Checkbox,
  ScoreBadge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@aypros/ui";
import type { BusinessListItem } from "@aypros/types";
import Link from "next/link";
import { PiHeart, PiHeartFill, PiKanban, PiMagnifyingGlass } from "react-icons/pi";
import { WebsiteBadge } from "./website-badge";

function locationLine(item: BusinessListItem): string {
  return [item.address ?? [item.city, item.state].filter(Boolean).join("/"), item.phone]
    .filter(Boolean)
    .join(" · ");
}

export function BusinessesCards({
  items,
  selectedIds,
  onSelectionChange,
  favoritePendingId,
  onToggleFavorite,
  auditPendingId,
  onAudit,
  pipelinePendingId,
  onAddToPipeline,
}: {
  items: BusinessListItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: string[], selected: boolean) => void;
  favoritePendingId: string | null;
  onToggleFavorite: (item: BusinessListItem) => void;
  auditPendingId: string | null;
  onAudit: (businessId: string) => void;
  pipelinePendingId: string | null;
  onAddToPipeline: (businessId: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <BusinessCard
          key={item.businessId}
          name={item.name}
          websiteUrl={item.websiteUrl}
          leading={
            <Checkbox
              aria-label={`Selecionar ${item.name}`}
              checked={selectedIds.has(item.businessId)}
              onCheckedChange={(checked) => onSelectionChange([item.businessId], checked === true)}
              className="mt-1"
            />
          }
          title={
            <Link
              href={`/businesses/${item.businessId}`}
              className="line-clamp-2 text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.name}
            </Link>
          }
          meta={
            <p className="line-clamp-2 whitespace-normal text-xs text-muted-foreground">
              {locationLine(item)}
            </p>
          }
          actions={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={item.favorited ? "Desfavoritar" : "Favoritar"}
              aria-pressed={item.favorited}
              loading={favoritePendingId === item.businessId}
              onClick={() => onToggleFavorite(item)}
            >
              {item.favorited ? (
                <PiHeartFill className="text-destructive" aria-hidden />
              ) : (
                <PiHeart aria-hidden />
              )}
            </Button>
          }
          badges={
            <>
              <WebsiteBadge {...item} />
              {item.score !== null && item.scoreLevel !== null ? (
                <ScoreBadge level={item.scoreLevel} score={item.score} />
              ) : null}
              <div className="ml-auto flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Auditar site"
                      loading={auditPendingId === item.businessId}
                      disabled={!item.websiteUrl}
                      onClick={() => onAudit(item.businessId)}
                    >
                      <PiMagnifyingGlass aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{item.websiteUrl ? "Auditar site" : "Empresa sem site"}</TooltipContent>
                </Tooltip>
                {item.leadId ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="size-7" asChild>
                        <Link href={`/pipeline/${item.leadId}`} aria-label="Ver no pipeline">
                          <PiKanban aria-hidden />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver no pipeline</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label="Adicionar ao pipeline"
                        loading={pipelinePendingId === item.businessId}
                        onClick={() => onAddToPipeline(item.businessId)}
                      >
                        <PiKanban aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Adicionar ao pipeline</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </>
          }
        />
      ))}
    </div>
  );
}
