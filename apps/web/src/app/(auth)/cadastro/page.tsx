import { AuthShell } from "../auth-shell";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthShell title="Criar conta" description="Configure seu acesso ao Aypros.">
      <SignupForm />
    </AuthShell>
  );
}
