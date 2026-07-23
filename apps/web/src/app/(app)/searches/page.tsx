import { Skeleton } from "@aypros/ui";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchesView } from "@/features/discovery/components/searches-view";

export const metadata: Metadata = { title: "Pesquisas" };

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
