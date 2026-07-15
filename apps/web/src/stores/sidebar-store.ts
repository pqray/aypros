"use client";

import { create } from "zustand";

type SidebarState = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

export const useSidebarStore = create<SidebarState>()((set) => ({
  mobileOpen: false,
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}));
