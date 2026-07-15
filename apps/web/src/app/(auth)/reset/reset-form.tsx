"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Label } from "@aypros/ui";
import { resetPasswordSchema, type ResetPasswordInput } from "@aypros/validation";
import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { SubmitButton } from "@/components/auth/submit-button";
import { resetPasswordAction } from "../actions";

export function ResetForm() {
  const [state, formAction] = useActionState(resetPasswordAction, {});
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
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
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" required {...form.register("email")} />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>
      {state.error ? <p className="text-sm text-muted-foreground">{state.error}</p> : null}
      <SubmitButton className="w-full" loadingText="Enviando...">
        Enviar instrucoes
      </SubmitButton>
      <Link className="block text-center text-sm text-muted-foreground hover:text-foreground" href="/login">
        Voltar para login
      </Link>
    </form>
  );
}
