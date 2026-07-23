import { Skeleton } from "@aypros/ui";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BusinessesView } from "@/features/businesses/components/businesses-view";

export const metadata: Metadata = { title: "Favoritos" };

export default function FavoritesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-64" />
        </div>
      }
    >
      <BusinessesView favoritesOnly title="Favoritos" description="Empresas favoritadas pela organização." />
    </Suspense>
  );
}
