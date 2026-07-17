"use client";

import { create } from "zustand";

// Temporary UI-only selection for batch actions on the businesses table
// (specs/11, specs/14 — never store server data here, only ids).
type BusinessSelectionState = {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  setMany: (ids: string[], selected: boolean) => void;
  clear: () => void;
};

export const useBusinessSelectionStore = create<BusinessSelectionState>()((set) => ({
  selectedIds: new Set(),
  toggle: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),
  setMany: (ids, selected) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      for (const id of ids) {
        if (selected) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return { selectedIds: next };
    }),
  clear: () => set({ selectedIds: new Set() }),
}));
