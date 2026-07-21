"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@aypros/ui";
import { createAyhubClientSchema, type CreateAyhubClientInputSchema } from "@aypros/validation";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PiPlus } from "react-icons/pi";
import type { z } from "zod";
import { useCreateAyhubClient } from "../queries";

type FormInput = z.input<typeof createAyhubClientSchema>;

export function CreateClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const createClient = useCreateAyhubClient();
  const form = useForm<FormInput, unknown, CreateAyhubClientInputSchema>({
    resolver: zodResolver(createAyhubClientSchema),
    defaultValues: { name: "", contact: "", maintenanceValue: undefined },
  });

  function fieldError(name: keyof FormInput) {
    const message = form.formState.errors[name]?.message;
    return typeof message === "string" ? <p className="text-sm text-destructive">{message}</p> : null;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !createClient.isPending) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: CreateAyhubClientInputSchema) {
    createClient.mutate(values, {
      onSuccess: (client) => {
        toast.success("Cliente cadastrado.");
        form.reset();
        onOpenChange(false);
        router.push(`/ayhub/${client.id}`);
      },
      onError: () => toast.error("Não foi possível cadastrar o cliente."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Cadastrar cliente</DialogTitle>
            <DialogDescription>
              Para clientes que vieram fora da pipeline do Aypros (indicação, contato direto, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ayhub-client-name">Nome</Label>
              <Input id="ayhub-client-name" autoFocus placeholder="Ex.: Doceria da Ana" {...form.register("name")} />
              {fieldError("name")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ayhub-client-contact">Contato</Label>
              <Input
                id="ayhub-client-contact"
                placeholder="Telefone ou e-mail"
                {...form.register("contact")}
              />
              {fieldError("contact")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ayhub-client-value">Valor de manutenção (R$/mês)</Label>
              <Input
                id="ayhub-client-value"
                type="number"
                min={0}
                step="0.01"
                {...form.register("maintenanceValue")}
              />
              {fieldError("maintenanceValue")}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createClient.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={createClient.isPending}>
              <PiPlus aria-hidden />
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
