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
import { OrganizationMembersCard } from "./organization-members-card";

export function OrganizationSettingsClient() {
  const { data: context, isLoading } = useAppContext();
  const organization = context?.organization;

  return (
    <div className="grid w-full max-w-6xl gap-4 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.35fr)]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle>Organização</CardTitle>
          <CardDescription>Configuracoes básicas da organização ativa.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : organization ? (
            <OrganizationForm organizationId={organization.id} defaultName={organization.name} />
          ) : (
            <EmptyState
              title="Nenhuma organização encontrada"
              description="Complete o onboarding para criar sua primeira organização."
            />
          )}
        </CardContent>
      </Card>
      {organization ? (
        <OrganizationMembersCard organizationId={organization.id} currentRole={organization.role} />
      ) : null}
    </div>
  );
}
