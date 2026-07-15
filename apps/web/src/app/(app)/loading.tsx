import { Card, CardContent, Skeleton } from "@aypros/ui";

export default function AppLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}
