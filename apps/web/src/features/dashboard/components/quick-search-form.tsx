"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@aypros/ui";
import { quickSearchSchema, type QuickSearchInput } from "@aypros/validation";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { PiMagnifyingGlass } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { ApiError } from "@/features/discovery/api";
import { AutocompleteInput } from "@/features/discovery/components/autocomplete-input";
import { BR_STATES, useCitiesByUf } from "@/features/discovery/ibge";
import { useCreateSearch } from "@/features/discovery/queries";
import { SEARCH_SEGMENTS } from "@/features/discovery/segments";

export function QuickSearchForm() {
  const router = useRouter();
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const createSearch = useCreateSearch(orgId);
  const form = useForm<QuickSearchInput>({
    resolver: zodResolver(quickSearchSchema),
    defaultValues: { city: "", state: "", segment: "" },
  });
  const selectedState = form.watch("state");
  const cities = useCitiesByUf(selectedState || undefined);

  function onSubmit(values: QuickSearchInput) {
    createSearch.mutate(values, {
      onSuccess: (response) => {
        if (response.reused) {
          toast.info("Reaproveitamos uma pesquisa igual feita ha menos de 24 horas.");
        }
        router.push(`/discovery?search=${response.search.id}`);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.body.code === "RATE_LIMITED") {
          const minutes = Math.max(1, Math.ceil((error.body.retryAfterSeconds ?? 3600) / 60));
          toast.error(`Limite de pesquisas atingido. Tente novamente em ${minutes} min.`);
          return;
        }
        toast.error(error instanceof ApiError ? error.body.error : "Erro ao criar pesquisa.");
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Busca rápida</CardTitle>
        <CardDescription>Encontre empresas por cidade e segmento.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="quick-search-state">UF</Label>
            <Controller
              control={form.control}
              name="state"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue("city", "");
                  }}
                >
                  <SelectTrigger id="quick-search-state" className="w-full">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map((state) => (
                      <SelectItem key={state.uf} value={state.uf}>
                        {state.uf} - {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.state ? (
              <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-search-city">Cidade</Label>
            <Controller
              control={form.control}
              name="city"
              render={({ field }) => (
                <AutocompleteInput
                  id="quick-search-city"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={
                    selectedState
                      ? cities.isLoading
                        ? "Carregando cidades..."
                        : "Digite para buscar a cidade"
                      : "Ex.: Fortaleza"
                  }
                  options={cities.data ?? []}
                  emptyMessage={
                    selectedState ? "Nenhuma cidade encontrada" : "Escolha uma UF primeiro"
                  }
                />
              )}
            />
            {form.formState.errors.city ? (
              <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-search-segment">Segmento</Label>
            <Controller
              control={form.control}
              name="segment"
              render={({ field }) => (
                <AutocompleteInput
                  id="quick-search-segment"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Ex.: Restaurantes"
                  options={[...SEARCH_SEGMENTS]}
                  emptyMessage="Digite outro segmento"
                />
              )}
            />
            {form.formState.errors.segment ? (
              <p className="text-sm text-destructive">{form.formState.errors.segment.message}</p>
            ) : null}
          </div>
          <Button
            type="submit"
            className="w-full"
            loading={createSearch.isPending}
            disabled={!orgId}
          >
            <PiMagnifyingGlass aria-hidden />
            Buscar empresas
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
