"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@aypros/ui";
import { useEffect, useState } from "react";

export function LostReasonDialog({
  open,
  onOpenChange,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como perdido?</DialogTitle>
          <DialogDescription>
            Isso também atualiza o status comercial do lead. Registre o motivo — ajuda a entender
            padrões de perda mais pra frente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="lost-reason">Motivo</Label>
          <Textarea
            id="lost-reason"
            autoFocus
            rows={3}
            placeholder="Ex.: já tem site, achou caro, não é prioridade agora..."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            loading={loading}
            disabled={reason.trim().length === 0}
            onClick={() => onConfirm(reason.trim())}
          >
            Marcar como perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
