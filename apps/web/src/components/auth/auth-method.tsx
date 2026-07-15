"use client";

import { Button, type ButtonProps } from "@aypros/ui";
import { useEffect, useState } from "react";
import { SiGoogle } from "react-icons/si";

type AuthMethod = "email" | "google";

const storageKey = "aypros:last-auth-method";

export function rememberAuthMethod(method: AuthMethod) {
  window.localStorage.setItem(storageKey, method);
}

export function useLastAuthMethod() {
  const [lastMethod, setLastMethod] = useState<AuthMethod | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    setLastMethod(stored === "email" || stored === "google" ? stored : null);
  }, []);

  return lastMethod;
}

export function LastUsedHint({ method }: { method: AuthMethod }) {
  const lastMethod = useLastAuthMethod();

  if (lastMethod !== method) {
    return null;
  }

  return <p className="text-xs text-muted-foreground">Ultimo metodo usado</p>;
}

export function GoogleAuthButton({ children, ...props }: ButtonProps) {
  const lastMethod = useLastAuthMethod();

  return (
    <Button type="submit" variant="outline" className="relative w-full gap-2" {...props}>
      <SiGoogle className="size-4" aria-hidden />
      <span>{children}</span>
      {lastMethod === "google" ? (
        <span className="pointer-events-none absolute right-3 top-0 -translate-y-1/2 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium leading-none text-muted-foreground shadow-sm">
          Last used
        </span>
      ) : null}
    </Button>
  );
}
