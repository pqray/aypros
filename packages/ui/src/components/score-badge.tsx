import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Visual-only opportunity badge. The level is computed by @aypros/scoring —
 * this component never derives it from a raw score (specs/15: no domain
 * logic in packages/ui).
 */
const scoreBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
  {
    variants: {
      level: {
        low: "bg-opportunity-low/15 text-opportunity-low",
        medium: "bg-opportunity-medium/15 text-opportunity-medium",
        high: "bg-opportunity-high/15 text-opportunity-high",
        very_high: "bg-opportunity-very-high/15 text-opportunity-very-high",
      },
    },
  },
);

const levelLabels: Record<NonNullable<ScoreBadgeProps["level"]>, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  very_high: "Muito alta",
};

export interface ScoreBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof scoreBadgeVariants> {
  level: "low" | "medium" | "high" | "very_high";
  score?: number;
  showLabel?: boolean;
}

function ScoreBadge({ level, score, showLabel = true, className, ...props }: ScoreBadgeProps) {
  return (
    <span
      className={cn(scoreBadgeVariants({ level }), className)}
      aria-label={`Oportunidade ${levelLabels[level].toLowerCase()}${
        score !== undefined ? `, score ${score}` : ""
      }`}
      {...props}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {score !== undefined ? <span>{score}</span> : null}
      {showLabel ? <span>{levelLabels[level]}</span> : null}
    </span>
  );
}

export { ScoreBadge, scoreBadgeVariants };
