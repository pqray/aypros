"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@aypros/ui";
import { PiClockCountdown } from "react-icons/pi";
import { formatRelativeTime } from "@/lib/format";

const COOLING_DAYS = 7;
const FOLLOW_UP_WINDOW_DAYS = 3;

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

export function FollowUpPanel({ lastContactAt }: { lastContactAt: string | null }) {
  if (!lastContactAt) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum contato registrado ainda. Registre o primeiro contato pra começar o
            acompanhamento — ou use a abordagem com IA abaixo pra mandar a primeira mensagem.
          </p>
        </CardContent>
      </Card>
    );
  }

  const days = daysSince(lastContactAt);
  const isCooling = days >= COOLING_DAYS;
  const dueForFollowUp = days >= FOLLOW_UP_WINDOW_DAYS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acompanhamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="flex items-center gap-2 text-sm">
          <PiClockCountdown aria-hidden className="text-muted-foreground" />
          Último contato {formatRelativeTime(lastContactAt)}
        </p>
        {isCooling ? (
          <Badge variant="warning">Esfriando — considere retomar contato</Badge>
        ) : dueForFollowUp ? (
          <Badge variant="muted">Bom momento pra um follow-up</Badge>
        ) : (
          <Badge variant="success">Contato recente</Badge>
        )}
      </CardContent>
    </Card>
  );
}
