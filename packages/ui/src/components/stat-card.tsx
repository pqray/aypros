import * as React from "react";
import { cn } from "../lib/cn";
import { Card, CardContent } from "./card";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
}

function StatCard({ label, value, icon, hint, className, ...props }: StatCardProps) {
  return (
    <Card className={cn(className)} {...props}>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {icon ? (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground [&_svg]:size-4">
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { StatCard };
