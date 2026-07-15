"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@aypros/ui";
import { useAppContext } from "@/components/shell/use-app-context";
import { ProfileForm } from "./profile-form";

export function ProfileSettingsClient() {
  const { data: context, isLoading } = useAppContext();

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Dados basicos da sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <ProfileForm
              defaultName={context?.profile.full_name}
              email={context?.user.email ?? undefined}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
