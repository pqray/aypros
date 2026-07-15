"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@aypros/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppContext } from "@/components/shell/use-app-context";
import { OnboardingForm } from "./onboarding-form";

export function OnboardingClient() {
  const router = useRouter();
  const { data: context, error, isLoading } = useAppContext();

  useEffect(() => {
    if (error) {
      router.replace("/login");
    }
  }, [error, router]);

  useEffect(() => {
    if (context?.profile.onboarding_completed_at) {
      router.replace("/dashboard");
    }
  }, [context, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Primeira configuracao</CardTitle>
          <CardDescription>Complete seu perfil e crie a organizacao de trabalho.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <OnboardingForm defaultName={context?.profile.full_name ?? undefined} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
