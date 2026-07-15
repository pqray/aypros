import { Button, EmptyState } from "@aypros/ui";
import Link from "next/link";

export function PlaceholderPage({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
      <EmptyState
        title={title}
        description={description}
        action={
          actionHref && actionLabel ? (
            <Button asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
