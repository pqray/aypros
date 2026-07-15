import { AuthShell } from "../auth-shell";
import { ResetForm } from "./reset-form";

export default function ResetPage() {
  return (
    <AuthShell title="Recuperar senha" description="Receba um link seguro para atualizar sua senha.">
      <ResetForm />
    </AuthShell>
  );
}
