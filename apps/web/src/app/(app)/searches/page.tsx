import { Skeleton } from "@aypros/ui";
import { Suspense } from "react";
import { SearchesView } from "@/features/discovery/components/searches-view";

export default function SearchesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-64" />
        </div>
      }
    >
      <SearchesView />
    </Suspense>
  );
}
