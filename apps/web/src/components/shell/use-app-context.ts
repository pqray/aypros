"use client";

import { useQuery } from "@tanstack/react-query";
import type { LoadedAppContext } from "@aypros/types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchAppContext() {
  const response = await fetch(`${apiUrl}/v1/app-context`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("APP_CONTEXT_UNAUTHORIZED");
  }

  return (await response.json()) as LoadedAppContext;
}

export function useAppContext() {
  return useQuery({
    queryKey: ["app-context"],
    queryFn: fetchAppContext,
    staleTime: 30_000,
    retry: false,
  });
}
