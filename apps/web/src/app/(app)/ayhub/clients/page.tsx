import { Skeleton } from "@aypros/ui";
import { Suspense } from "react";
import { AyhubClientsView } from "@/features/ayhub/components/ayhub-clients-view";

export default function AyhubClientsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-64" />
        </div>
      }
    >
      <AyhubClientsView />
    </Suspense>
  );
}
