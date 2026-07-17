import { Skeleton } from "@aypros/ui";
import { Suspense } from "react";
import { DiscoveryView } from "@/features/discovery/components/discovery-view";

export default function DiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-28" />
        </div>
      }
    >
      <DiscoveryView />
    </Suspense>
  );
}
