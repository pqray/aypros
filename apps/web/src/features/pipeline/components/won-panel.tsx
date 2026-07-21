"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@aypros/ui";
import Link from "next/link";
import { PiBuildings } from "react-icons/pi";

export function WonPanel({ ayhubClientId }: { ayhubClientId: string | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cliente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ayhubClientId ? (
          <>
            <p className="text-sm text-muted-foreground">
              Esta oportunidade já virou cliente no AYhub.
            </p>
            <Button asChild variant="outline">
              <Link href={`/ayhub/${ayhubClientId}`}>
                <PiBuildings aria-hidden />
                Ver cliente no AYhub
              </Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            O cliente ainda não apareceu no AYhub (ou você não tem acesso ao módulo). Se acabou de
            marcar como ganho, atualize a página em alguns instantes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
