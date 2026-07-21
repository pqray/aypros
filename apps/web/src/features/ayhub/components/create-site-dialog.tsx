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
import { createAyhubSiteSchema, type CreateAyhubSiteInputSchema } from "@aypros/validation";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PiPlus } from "react-icons/pi";
import { useCreateAyhubSite } from "../queries";

export function CreateSiteDialog({
  clientId,
  open,
  onOpenChange,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createSite = useCreateAyhubSite(clientId);
  const form = useForm<CreateAyhubSiteInputSchema>({
    resolver: zodResolver(createAyhubSiteSchema),
    defaultValues: { slug: "", domain: "" },
  });

  function fieldError(name: keyof CreateAyhubSiteInputSchema) {
    const message = form.formState.errors[name]?.message;
    return typeof message === "string" ? <p className="text-sm text-destructive">{message}</p> : null;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !createSite.isPending) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: CreateAyhubSiteInputSchema) {
    createSite.mutate(values, {
      onSuccess: (site) => {
        toast.success("Site criado.");
        form.reset();
        onOpenChange(false);
        router.push(`/ayhub/sites/${site.id}`);
      },
      onError: () => toast.error("Não foi possível criar o site. Verifique se o slug já está em uso."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Criar site</DialogTitle>
            <DialogDescription>
              Os blocos de SEO (título, descrição, imagem) são criados automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ayhub-site-slug">Slug</Label>
              <Input id="ayhub-site-slug" autoFocus placeholder="doceria-da-ana" {...form.register("slug")} />
              {fieldError("slug")}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ayhub-site-domain">Domínio</Label>
              <Input id="ayhub-site-domain" placeholder="doceriadaana.com.br" {...form.register("domain")} />
              {fieldError("domain")}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createSite.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={createSite.isPending}>
              <PiPlus aria-hidden />
              Criar site
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
