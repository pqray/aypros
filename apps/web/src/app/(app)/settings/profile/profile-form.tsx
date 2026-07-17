"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Label, toast } from "@aypros/ui";
import { profileSchema, type ProfileInput } from "@aypros/validation";
import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { SubmitButton } from "@/components/auth/submit-button";
import { updateProfileAction } from "../actions";

export function ProfileForm({ defaultName, email }: { defaultName?: string | null; email?: string }) {
  const [state, formAction] = useActionState(updateProfileAction, {});
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: defaultName ?? "",
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
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo</Label>
        <Input id="fullName" autoComplete="name" required {...form.register("fullName")} />
        {form.formState.errors.fullName ? (
          <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" value={email ?? ""} disabled readOnly />
      </div>
      <SubmitButton loadingText="Salvando...">Salvar perfil</SubmitButton>
    </form>
  );
}
