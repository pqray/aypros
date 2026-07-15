"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Label } from "@aypros/ui";
import { loginSchema, type LoginInput } from "@aypros/validation";
import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { GoogleAuthButton, LastUsedHint, rememberAuthMethod } from "@/components/auth/auth-method";
import { SubmitButton } from "@/components/auth/submit-button";
import { googleSignInAction, loginAction } from "../actions";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, {});
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
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
            autoComplete="current-password"
            required
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <LastUsedHint method="email" />
        <SubmitButton className="w-full" loadingText="Entrando...">
          Entrar
        </SubmitButton>
      </form>

      <form action={googleSignInAction} onSubmit={() => rememberAuthMethod("google")}>
        <GoogleAuthButton>
          Entrar com Google
        </GoogleAuthButton>
      </form>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <Link className="hover:text-foreground" href="/reset">
          Esqueci minha senha
        </Link>
        <Link className="hover:text-foreground" href="/cadastro">
          Criar conta
        </Link>
      </div>
    </div>
  );
}
