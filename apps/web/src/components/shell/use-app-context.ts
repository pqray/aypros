"use client";

import { useQuery } from "@tanstack/react-query";
import type { LoadedAppContext } from "@aypros/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class AppContextError extends Error {
  constructor(public readonly status: number) {
    super("APP_CONTEXT_ERROR");
  }
}

async function fetchAppContext() {
  const response = await fetch(`${apiUrl}/v1/app-context`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new AppContextError(response.status);
  }

  return (await response.json()) as LoadedAppContext;
}

export function useAppContext() {
  return useQuery({
    queryKey: ["app-context"],
    queryFn: fetchAppContext,
    staleTime: 120_000,
    retry: false,
  });
}
