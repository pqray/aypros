"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@aypros/ui";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { PiMagnifyingGlass, PiMoon, PiPlus, PiSun } from "react-icons/pi";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { notifyNavigationStart } from "./navigation-progress";
import { managementNavItems, primaryNavItems, secondaryNavItems } from "./navigation";

export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const open = useCommandPaletteStore((state) => state.open);
  const setOpen = useCommandPaletteStore((state) => state.setOpen);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  function run(command: () => void) {
    setOpen(false);
    command();
  }

  function navigate(href: string) {
    run(() => {
      // router.push não passa por <a>, então a barra de progresso precisa do aviso manual.
      notifyNavigationStart();
      router.push(href);
    });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command palette" description="Navegue pelo app">
      <CommandInput placeholder="Buscar página ou ação..." />
      <CommandList>
        <CommandEmpty>Nenhum comando encontrado.</CommandEmpty>
        <CommandGroup heading="Navegação">
          {[...primaryNavItems, ...managementNavItems, ...secondaryNavItems].map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.href} value={item.label} onSelect={() => navigate(item.href)}>
                <Icon aria-hidden />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ações">
          <CommandItem value="Nova pesquisa" onSelect={() => navigate("/discovery")}>
            <PiPlus aria-hidden />
            Nova pesquisa
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem value="Alternar para tema claro" onSelect={() => run(() => setTheme("light"))}>
            <PiSun aria-hidden />
            Tema claro
          </CommandItem>
          <CommandItem value="Alternar para tema escuro" onSelect={() => run(() => setTheme("dark"))}>
            <PiMoon aria-hidden />
            Tema escuro
          </CommandItem>
          <CommandItem value="Buscar comandos" onSelect={() => run(() => setOpen(true))}>
            <PiMagnifyingGlass aria-hidden />
            Buscar comandos
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
