"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

// Static UF list (stable data — no reason to fetch).
export const BR_STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
] as const;

const municipalitiesSchema = z.array(z.object({ nome: z.string().min(1) }));

export function parseMunicipalities(input: unknown): string[] {
  return municipalitiesSchema.parse(input).map((row) => row.nome);
}

async function fetchCitiesByUf(uf: string): Promise<string[]> {
  const response = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`,
  );
  if (!response.ok) {
    throw new Error("IBGE_FETCH_FAILED");
  }
  return parseMunicipalities(await response.json());
}

/** Municipality names for a UF (IBGE). Stable data → cache aggressively. */
export function useCitiesByUf(uf: string | undefined) {
  return useQuery({
    queryKey: ["ibge", "cities", uf],
    queryFn: () => fetchCitiesByUf(uf as string),
    enabled: Boolean(uf && uf.length === 2),
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
