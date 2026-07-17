"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Tab ativa como estado de URL (specs/14: URL como fonte de verdade). Além de
 * sobreviver a refresh/compartilhamento, garante que re-renders/remounts
 * (ex.: invalidations do TanStack após gerar IA) nunca "voltem" a aba.
 */
export function useTabParam<T extends string>(
  param: string,
  defaultValue: T,
  values: readonly T[],
): [T, (next: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(param);
  const value = raw !== null && (values as readonly string[]).includes(raw) ? (raw as T) : defaultValue;

  function setValue(next: T) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === defaultValue) {
      params.delete(param);
    } else {
      params.set(param, next);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return [value, setValue];
}
