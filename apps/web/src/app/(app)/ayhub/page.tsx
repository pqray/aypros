import { Skeleton } from "@aypros/ui";
import { Suspense } from "react";
import { AyhubDashboardView } from "@/features/ayhub/components/ayhub-dashboard-view";

export default function AyhubPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-64" />
        </div>
      }
    >
      <AyhubDashboardView />
    </Suspense>
  );
}
