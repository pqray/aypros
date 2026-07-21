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
import {
  createManualBusinessSchema,
  type CreateManualBusinessInput,
} from "@aypros/validation";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { PiPlus } from "react-icons/pi";
import { SEARCH_SEGMENTS } from "@/features/discovery/segments";
import { useCreateManualBusiness } from "../queries";

export function ManualBusinessDialog({
  orgId,
  open,
  onOpenChange,
}: {
  orgId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createManualBusiness = useCreateManualBusiness(orgId);
  const form = useForm<CreateManualBusinessInput>({
    resolver: zodResolver(createManualBusinessSchema),
    defaultValues: {
      name: "",
      segment: "",
      city: "",
      state: "",
      phone: "",
      websiteUrl: "",
      instagramUrl: "",
    },
  });

  function fieldError(name: keyof CreateManualBusinessInput) {
    const message = form.formState.errors[name]?.message;
    return typeof message === "string" ? <p className="text-sm text-destructive">{message}</p> : null;
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !createManualBusiness.isPending) {
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: CreateManualBusinessInput) {
    createManualBusiness.mutate(values, {
      onSuccess: (response) => {
        toast.success("Empresa cadastrada.");
        form.reset();
        onOpenChange(false);
        router.push(`/businesses/${response.businessId}`);
      },
      onError: () => toast.error("Nao foi possivel cadastrar a empresa."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Cadastrar empresa</DialogTitle>
            <DialogDescription>
              Adicione uma empresa encontrada fora das buscas automaticas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="manual-business-name">Nome</Label>
              <Input
                id="manual-business-name"
                autoFocus
                placeholder="Ex.: Doceria da Ana"
                {...form.register("name")}
              />
              {fieldError("name")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-business-segment">Segmento</Label>
              <Input
                id="manual-business-segment"
                list="manual-business-segments"
                placeholder="Ex.: Doceria"
                {...form.register("segment")}
              />
              <datalist id="manual-business-segments">
                {SEARCH_SEGMENTS.map((segment) => (
                  <option key={segment} value={segment} />
                ))}
              </datalist>
              {fieldError("segment")}
            </div>

            <div className="grid grid-cols-[1fr_72px] gap-2">
              <div className="space-y-2">
                <Label htmlFor="manual-business-city">Cidade</Label>
                <Input id="manual-business-city" placeholder="Fortaleza" {...form.register("city")} />
                {fieldError("city")}
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-business-state">UF</Label>
                <Input
                  id="manual-business-state"
                  placeholder="CE"
                  maxLength={2}
                  className="uppercase"
                  {...form.register("state")}
                />
                {fieldError("state")}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-business-phone">Telefone</Label>
              <Input id="manual-business-phone" placeholder="(85) 99999-0000" {...form.register("phone")} />
              {fieldError("phone")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-business-instagram">Instagram</Label>
              <Input
                id="manual-business-instagram"
                placeholder="@empresa ou instagram.com/empresa"
                {...form.register("instagramUrl")}
              />
              {fieldError("instagramUrl")}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="manual-business-website">Site</Label>
              <Input
                id="manual-business-website"
                placeholder="empresa.com.br"
                {...form.register("websiteUrl")}
              />
              {fieldError("websiteUrl")}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createManualBusiness.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={createManualBusiness.isPending}>
              <PiPlus aria-hidden />
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
