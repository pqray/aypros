"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from "@aypros/ui";
import { useAppContext } from "@/components/shell/use-app-context";
import { OrganizationForm } from "./organization-form";

export function OrganizationSettingsClient() {
  const { data: context, isLoading } = useAppContext();
  const organization = context?.organization;

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Organizacao</CardTitle>
          <CardDescription>Configuracoes basicas da organizacao ativa.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : organization ? (
            <OrganizationForm organizationId={organization.id} defaultName={organization.name} />
          ) : (
            <EmptyState
              title="Nenhuma organizacao encontrada"
              description="Complete o onboarding para criar sua primeira organizacao."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
