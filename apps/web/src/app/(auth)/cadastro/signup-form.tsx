"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Label } from "@aypros/ui";
import { signupSchema, type SignupInput } from "@aypros/validation";
import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { GoogleAuthButton, LastUsedHint, rememberAuthMethod } from "@/components/auth/auth-method";
import { SubmitButton } from "@/components/auth/submit-button";
import { googleSignInAction, signupAction } from "../actions";

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, {});
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  return (
    <div className="space-y-4">
      <form
        action={formAction}
        className="space-y-4"
        onSubmit={async (event) => {
          if (!(await form.trigger())) {
            event.preventDefault();
            return;
          }
          rememberAuthMethod("email");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome</Label>
          <Input id="fullName" autoComplete="name" required {...form.register("fullName")} />
          {form.formState.errors.fullName ? (
            <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" required {...form.register("email")} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword ? (
            <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
          ) : null}
        </div>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <LastUsedHint method="email" />
        <SubmitButton className="w-full" loadingText="Criando...">
          Criar conta
        </SubmitButton>
      </form>

      <form action={googleSignInAction} onSubmit={() => rememberAuthMethod("google")}>
        <GoogleAuthButton>
          Cadastrar com Google
        </GoogleAuthButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Ja tem conta?{" "}
        <Link className="text-foreground hover:underline" href="/login">
          Entrar
        </Link>
      </p>
    </div>
  );
}
