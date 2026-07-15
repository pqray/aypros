import type { IconType } from "react-icons";
import {
  PiBriefcase,
  PiChartLineUp,
  PiClockCounterClockwise,
  PiGear,
  PiHeart,
  PiKanban,
  PiMagnifyingGlass,
  PiUser,
} from "react-icons/pi";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: IconType;
  exact?: boolean;
};

export const primaryNavItems: ShellNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: PiChartLineUp, exact: true },
  { href: "/discovery", label: "Descoberta", icon: PiMagnifyingGlass },
  { href: "/searches", label: "Pesquisas", icon: PiClockCounterClockwise },
  { href: "/businesses", label: "Empresas", icon: PiBriefcase },
  { href: "/favorites", label: "Favoritos", icon: PiHeart },
  { href: "/pipeline", label: "Pipeline", icon: PiKanban },
];

export const secondaryNavItems: ShellNavItem[] = [
  { href: "/settings/profile", label: "Perfil", icon: PiUser },
  { href: "/settings/organization", label: "Organização", icon: PiGear },
];

export const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  discovery: "Descoberta",
  searches: "Pesquisas",
  businesses: "Empresas",
  favorites: "Favoritos",
  pipeline: "Pipeline",
  settings: "Configurações",
  profile: "Perfil",
  organization: "Organização",
};

export function isActiveRoute(pathname: string, item: ShellNavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
