"use client";

import { Button, EmptyState } from "@aypros/ui";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
      <EmptyState
        title="Não foi possível carregar"
        description="Tente novamente. Se o problema continuar, revise sua sessão."
        action={<Button onClick={reset}>Tentar novamente</Button>}
      />
    </div>
  );
}
