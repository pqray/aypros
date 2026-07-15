import { Button, EmptyState } from "@aypros/ui";
import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
      <EmptyState
        title="Página não encontrada"
        description="O endereço acessado não corresponde a uma área disponível."
        action={
          <Button asChild>
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
