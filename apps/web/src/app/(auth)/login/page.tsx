import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthShell title="Entrar" description="Acesse sua área de prospecção.">
      <LoginForm />
    </AuthShell>
  );
}
