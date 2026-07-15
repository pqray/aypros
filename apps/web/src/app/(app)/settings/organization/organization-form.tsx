"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Label } from "@aypros/ui";
import { organizationSchema, type OrganizationInput } from "@aypros/validation";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { SubmitButton } from "@/components/auth/submit-button";
import { updateOrganizationAction } from "../actions";

export function OrganizationForm({
  organizationId,
  defaultName,
}: {
  organizationId: string;
  defaultName: string;
}) {
  const [state, formAction] = useActionState(updateOrganizationAction, {});
  const form = useForm<OrganizationInput>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: defaultName,
    },
  });

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={async (event) => {
        if (!(await form.trigger())) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="space-y-2">
        <Label htmlFor="name">Nome da organizacao</Label>
        <Input id="name" required {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-muted-foreground">{state.success}</p> : null}
      <SubmitButton loadingText="Salvando...">Salvar organizacao</SubmitButton>
    </form>
  );
}
