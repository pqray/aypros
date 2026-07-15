"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Label } from "@aypros/ui";
import { onboardingSchema, type OnboardingInput } from "@aypros/validation";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { SubmitButton } from "@/components/auth/submit-button";
import { completeOnboardingAction } from "./actions";

export function OnboardingForm({ defaultName }: { defaultName?: string }) {
  const [state, formAction] = useActionState(completeOnboardingAction, {});
  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: defaultName ?? "",
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
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo</Label>
        <Input id="fullName" autoComplete="name" required {...form.register("fullName")} />
        {form.formState.errors.fullName ? (
          <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organizacao</Label>
        <Input
          id="organizationName"
          placeholder="Nome da sua empresa"
          required
          {...form.register("organizationName")}
        />
        {form.formState.errors.organizationName ? (
          <p className="text-sm text-destructive">{form.formState.errors.organizationName.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="professionalRole">Contexto de uso</Label>
        <Input
          id="professionalRole"
          placeholder="Ex.: designer, agencia, freelancer"
          {...form.register("professionalRole")}
        />
        {form.formState.errors.professionalRole ? (
          <p className="text-sm text-destructive">{form.formState.errors.professionalRole.message}</p>
        ) : null}
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton className="w-full" loadingText="Finalizando...">
        Continuar
      </SubmitButton>
    </form>
  );
}
