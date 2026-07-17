"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@aypros/ui";
import type { CreateSearchResponse } from "@aypros/types";
import { createSearchSchema, type CreateSearchInput } from "@aypros/validation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { PiMagnifyingGlass } from "react-icons/pi";
import { ApiError } from "../api";
import { BR_STATES, useCitiesByUf } from "../ibge";
import { useCreateSearch } from "../queries";
import { SEARCH_SEGMENTS } from "../segments";
import { AutocompleteInput } from "./autocomplete-input";

export function DiscoveryForm({
  orgId,
  defaultValues,
  onCreated,
}: {
  orgId: string | undefined;
  defaultValues: Partial<CreateSearchInput>;
  onCreated: (response: CreateSearchResponse, input: CreateSearchInput) => void;
}) {
  const createSearch = useCreateSearch(orgId);
  const form = useForm<CreateSearchInput>({
    resolver: zodResolver(createSearchSchema),
    defaultValues: {
      city: defaultValues.city ?? "",
      state: defaultValues.state ?? "",
      segment: defaultValues.segment ?? "",
    },
  });

  const selectedState = form.watch("state");
  const cities = useCitiesByUf(selectedState || undefined);

  useEffect(() => {
    form.reset({
      city: defaultValues.city ?? "",
      state: defaultValues.state ?? "",
      segment: defaultValues.segment ?? "",
    });
  }, [defaultValues.city, defaultValues.segment, defaultValues.state, form]);

  function onSubmit(values: CreateSearchInput) {
    createSearch.mutate(values, {
      onSuccess: (response) => {
        if (response.reused) {
          toast.info("Reaproveitamos uma pesquisa igual feita há menos de 24 horas.");
        }
        onCreated(response, values);
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
      <CardContent className="p-5">
        <form
          className="grid gap-4 lg:grid-cols-[15rem_minmax(18rem,1fr)_minmax(18rem,1fr)_12rem] lg:items-start"
          onSubmit={form.handleSubmit(onSubmit)}
          autoComplete="off"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="discovery-state">UF</Label>
            <Controller
              control={form.control}
              name="state"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={(value) => {
                    field.onChange(value);
                    // City list changes with the UF; a previously typed city may not exist there.
                    form.setValue("city", "");
                  }}
                >
                  <SelectTrigger id="discovery-state" className="h-12 w-full">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map((state) => (
                      <SelectItem key={state.uf} value={state.uf}>
                        {state.uf} — {state.name}
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
            <Label htmlFor="discovery-city">Cidade</Label>
            <Controller
              control={form.control}
              name="city"
              render={({ field }) => (
                <AutocompleteInput
                  id="discovery-city"
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
                  inputClassName="h-12"
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
            <Label htmlFor="discovery-segment">Segmento</Label>
            <Controller
              control={form.control}
              name="segment"
              render={({ field }) => (
                <AutocompleteInput
                  id="discovery-segment"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Ex.: Restaurantes"
                  options={[...SEARCH_SEGMENTS]}
                  inputClassName="h-12"
                  emptyMessage="Digite outro segmento"
                />
              )}
            />
            {form.formState.errors.segment ? (
              <p className="text-sm text-destructive">{form.formState.errors.segment.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="hidden h-5 lg:block" aria-hidden />
            <Button
              type="submit"
              className="h-12 w-full"
              loading={createSearch.isPending}
              disabled={!orgId}
            >
              <PiMagnifyingGlass aria-hidden />
              Pesquisar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
