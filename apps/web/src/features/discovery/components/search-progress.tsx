"use client";

import { Badge, Button } from "@aypros/ui";
import type { SearchSummary } from "@aypros/types";
import { PiArrowClockwise, PiCircleNotch } from "react-icons/pi";
import { searchStatusLabels, searchStatusVariants } from "@/lib/search-status";

export function SearchProgress({
  search,
  onRetry,
  retrying,
}: {
  search: SearchSummary;
  onRetry: () => void;
  retrying: boolean;
}) {
  const running = search.status === "pending" || search.status === "processing";
  const canRetry = search.status === "failed" || search.status === "partial";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3 text-card-foreground">
      {running ? (
        <PiCircleNotch className="size-4 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
      <Badge variant={searchStatusVariants[search.status]}>{searchStatusLabels[search.status]}</Badge>
      <p className="text-sm text-muted-foreground">
        {search.segment} em {search.city}
        {search.state ? `/${search.state}` : ""}
        {" · "}
        {search.totalFound === 1 ? "1 empresa encontrada" : `${search.totalFound} empresas encontradas`}
      </p>
      {search.errorMessage ? (
        <p className="w-full text-sm text-destructive sm:w-auto">{search.errorMessage}</p>
      ) : null}
      {canRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} loading={retrying} className="ml-auto">
          <PiArrowClockwise aria-hidden />
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
