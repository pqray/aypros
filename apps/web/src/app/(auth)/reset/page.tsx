import type { Metadata } from "next";
import { AuthShell } from "../auth-shell";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ResetPage() {
  return (
    <AuthShell title="Recuperar senha" description="Receba um link seguro para atualizar sua senha.">
      <ResetForm />
    </AuthShell>
  );
}
