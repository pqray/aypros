import * as React from "react";
import { cn } from "../lib/cn";

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

function PageHeader({ title, description, actions, icon, className, ...props }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon ? <div className="shrink-0">{icon}</div> : null}
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="truncate text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export { PageHeader };
