"use client";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@aypros/ui";
import type { BusinessListQuery } from "@aypros/types";
import { useEffect, useState } from "react";
import { PiFunnel } from "react-icons/pi";
import { hasActiveFilters } from "../filters";

type TriState = "all" | "true" | "false";

function toTriState(value: boolean | undefined): TriState {
  if (value === true) return "true";
  if (value === false) return "false";
  return "all";
}

function fromTriState(value: TriState): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function BusinessesFiltersSheet({
  query,
  onApply,
}: {
  query: BusinessListQuery;
  onApply: (next: Partial<BusinessListQuery>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [minScore, setMinScore] = useState(query.minScore?.toString() ?? "");
  const [maxScore, setMaxScore] = useState(query.maxScore?.toString() ?? "");
  const [minRating, setMinRating] = useState(query.minRating?.toString() ?? "");

  useEffect(() => {
    if (open) {
      setMinScore(query.minScore?.toString() ?? "");
      setMaxScore(query.maxScore?.toString() ?? "");
      setMinRating(query.minRating?.toString() ?? "");
    }
  }, [open, query.minScore, query.maxScore, query.minRating]);

  function applyRanges() {
    onApply({
      minScore: minScore ? Number(minScore) : undefined,
      maxScore: maxScore ? Number(maxScore) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <PiFunnel aria-hidden />
        Filtros
        {hasActiveFilters(query) ? (
          <span className="flex size-1.5 rounded-full bg-primary" aria-hidden />
        ) : null}
      </Button>
      <SheetContent side="right" className="w-full space-y-6 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Refine a lista de empresas descobertas.</SheetDescription>
        </SheetHeader>

        <div className="space-y-2">
          <Label>Score</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Mín."
              value={minScore}
              onChange={(event) => setMinScore(event.target.value)}
              onBlur={applyRanges}
            />
            <span className="text-muted-foreground">a</span>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Máx."
              value={maxScore}
              onChange={(event) => setMaxScore(event.target.value)}
              onBlur={applyRanges}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-min-rating">Avaliação mínima</Label>
          <Input
            id="filter-min-rating"
            type="number"
            min={0}
            max={5}
            step={0.5}
            placeholder="Ex.: 4"
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
            onBlur={applyRanges}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-audited">Auditoria</Label>
          <Select
            value={toTriState(query.audited)}
            onValueChange={(value) => onApply({ audited: fromTriState(value as TriState) })}
          >
            <SelectTrigger id="filter-audited">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="true">Auditadas</SelectItem>
              <SelectItem value="false">Não auditadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-pipeline">Pipeline</Label>
          <Select
            value={toTriState(query.inPipeline)}
            onValueChange={(value) => onApply({ inPipeline: fromTriState(value as TriState) })}
          >
            <SelectTrigger id="filter-pipeline">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="true">Já no pipeline</SelectItem>
              <SelectItem value="false">Fora do pipeline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters(query) ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMinScore("");
              setMaxScore("");
              setMinRating("");
              onApply({
                websiteFilter: "all",
                minScore: undefined,
                maxScore: undefined,
                minRating: undefined,
                audited: undefined,
                inPipeline: undefined,
                search: undefined,
              });
            }}
          >
            Limpar filtros
          </Button>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
