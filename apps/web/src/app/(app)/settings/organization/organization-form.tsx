"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Label, toast } from "@aypros/ui";
import { organizationSchema, type OrganizationInput } from "@aypros/validation";
import { useActionState, useEffect } from "react";
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

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
    if (state.success) {
      toast.success(state.success);
    }
  }, [state.error, state.success]);

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
        <Label htmlFor="name">Nome da organização</Label>
        <Input id="name" required {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
      </div>
      <SubmitButton loadingText="Salvando...">Salvar organização</SubmitButton>
    </form>
  );
}
