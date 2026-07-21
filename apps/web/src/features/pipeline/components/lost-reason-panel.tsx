"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@aypros/ui";

export function LostReasonPanel({ lostReason }: { lostReason: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Motivo da perda</CardTitle>
      </CardHeader>
      <CardContent>
        {lostReason ? (
          <p className="text-sm text-foreground">{lostReason}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum motivo registrado.</p>
        )}
      </CardContent>
    </Card>
  );
}
