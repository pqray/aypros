import { Skeleton } from "@aypros/ui";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AyhubDashboardView } from "@/features/ayhub/components/ayhub-dashboard-view";

export const metadata: Metadata = { title: "Dashboard AYhub" };

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
