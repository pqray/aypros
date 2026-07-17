import type { ActivityType } from "@aypros/types";
import type { ComponentType } from "react";
import {
  PiBrain,
  PiBriefcase,
  PiChartLineUp,
  PiDownloadSimple,
  PiHeart,
  PiMagnifyingGlass,
  PiNotePencil,
} from "react-icons/pi";

export const activityLabels: Record<ActivityType, string> = {
  search_created: "Pesquisa criada",
  business_favorited: "Empresa favoritada",
  audit_completed: "Auditoria de site concluída",
  lead_created: "Lead adicionado ao pipeline",
  lead_stage_changed: "Lead mudou de etapa",
  note_created: "Nota criada",
  ai_generated: "Conteúdo gerado com IA",
  export_created: "Exportação criada",
};

export const activityIcons: Record<ActivityType, ComponentType<{ className?: string }>> = {
  search_created: PiMagnifyingGlass,
  business_favorited: PiHeart,
  audit_completed: PiChartLineUp,
  lead_created: PiBriefcase,
  lead_stage_changed: PiBriefcase,
  note_created: PiNotePencil,
  ai_generated: PiBrain,
  export_created: PiDownloadSimple,
};
