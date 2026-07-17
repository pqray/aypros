import { Skeleton } from "@aypros/ui";
import { Suspense } from "react";
import { BusinessesView } from "@/features/businesses/components/businesses-view";

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
