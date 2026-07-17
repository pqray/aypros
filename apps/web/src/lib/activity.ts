import type { ActivityType } from "@aypros/types";
import type { ComponentType } from "react";
import {
  PiBrain,
  PiArrowsClockwise,
  PiBriefcase,
  PiChartLineUp,
  PiDownloadSimple,
  PiHeart,
  PiMagnifyingGlass,
  PiNotePencil,
  PiPhoneCall,
} from "react-icons/pi";

export const activityLabels: Record<ActivityType, string> = {
  search_created: "Pesquisa criada",
  business_favorited: "Empresa favoritada",
  audit_completed: "Auditoria de site concluída",
  data_refresh_requested: "Dados atualizados",
  lead_created: "Lead adicionado ao pipeline",
  lead_assigned: "Responsavel alterado",
  lead_contacted: "Contato registrado",
  lead_stage_changed: "Lead mudou de etapa",
  lead_archived: "Lead removido do pipeline",
  note_created: "Nota criada",
  ai_generated: "Conteúdo gerado com IA",
  export_created: "Exportação criada",
};

export const activityIcons: Record<ActivityType, ComponentType<{ className?: string }>> = {
  search_created: PiMagnifyingGlass,
  business_favorited: PiHeart,
  audit_completed: PiChartLineUp,
  data_refresh_requested: PiArrowsClockwise,
  lead_created: PiBriefcase,
  lead_assigned: PiBriefcase,
  lead_contacted: PiPhoneCall,
  lead_stage_changed: PiBriefcase,
  lead_archived: PiBriefcase,
  note_created: PiNotePencil,
  ai_generated: PiBrain,
  export_created: PiDownloadSimple,
};
