import type { ApiErrorBody } from "@aypros/types";

// Caminho relativo: passa pelo rewrite do next.config.ts pra manter o cookie
// de sessao do Supabase same-origin (web e API ficam em dominios diferentes).
export const apiUrl = "/api/backend";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.error);
    this.name = "ApiError";
  }
}

/** Shared fetch wrapper for apps/api (specs/14: TanStack Query drives all product data). */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => ({ error: "Erro inesperado" }))) as ApiErrorBody;
    throw new ApiError(response.status, body);
  }

  // 204 (deletes) não tem corpo — response.json() estouraria.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
