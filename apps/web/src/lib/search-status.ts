import type { SearchStatus } from "@aypros/types";

export const searchStatusLabels: Record<SearchStatus, string> = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Concluída",
  partial: "Parcial",
  failed: "Falhou",
};

export const searchStatusVariants: Record<
  SearchStatus,
  "muted" | "info" | "success" | "warning" | "destructive"
> = {
  pending: "muted",
  processing: "info",
  completed: "success",
  partial: "warning",
  failed: "destructive",
};
