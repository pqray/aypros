"use client";

import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@aypros/ui";
import Link from "next/link";
import { PiBuildingOffice, PiSignOut, PiUser } from "react-icons/pi";
import { logoutAction } from "@/app/(auth)/actions";
import type { ShellUser } from "./app-shell";

function initials(user: ShellUser | null) {
  const source = user?.fullName || user?.email || "Conta";
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({ user }: { user: ShellUser | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2" aria-label="Abrir menu do usuário">
          <Avatar className="size-7">
            <AvatarFallback>{initials(user)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm md:inline">
            {user?.fullName || user?.email || "Conta"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate">{user?.fullName || "Conta"}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user?.email || "Carregando sessão"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <PiUser aria-hidden /> Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/organization">
            <PiBuildingOffice aria-hidden /> Organização
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logoutAction}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <PiSignOut aria-hidden /> Sair
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
