import type { Metadata } from "next";
import { AuthShell } from "../auth-shell";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <AuthShell title="Criar conta" description="Configure seu acesso ao Aypros.">
      <SignupForm />
    </AuthShell>
  );
}
