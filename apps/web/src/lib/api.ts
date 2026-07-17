import type { ApiErrorBody } from "@aypros/types";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

  return (await response.json()) as T;
}
