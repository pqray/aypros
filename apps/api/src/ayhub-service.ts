import { randomBytes, createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export function hashSiteKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateSiteKey(): { plaintext: string; hash: string } {
  const plaintext = `ayh_${randomBytes(32).toString("hex")}`;
  return { plaintext, hash: hashSiteKey(plaintext) };
}

export type FindOrCreateAyhubClientParams = {
  orgId: string;
  leadId: string;
  businessName: string;
  businessPhone: string | null;
  suggestedMaintenanceValue: number | null;
};

/**
 * Cria (ou localiza) o cliente AYhub correspondente a um lead que acabou de
 * virar "won". Best-effort e idempotente: reaplicar para o mesmo lead nunca
 * duplica, e o cliente permanece mesmo que o lead volte para outro status
 * (specs/21 — P2). Dedupe: primeiro pela própria oportunidade de origem
 * (reentrada no "won"), depois pelo telefone da empresa (único dado de
 * contato disponível hoje em `businesses`) quando presente.
 */
export async function findOrCreateAyhubClient(
  serviceDb: SupabaseClient,
  params: FindOrCreateAyhubClientParams,
): Promise<{ clientId: string; created: boolean }> {
  const { orgId, leadId, businessName, businessPhone, suggestedMaintenanceValue } = params;

  const { data: byOrigin } = await serviceDb
    .schema("ayhub")
    .from("clients")
    .select("id")
    .eq("organization_id", orgId)
    .eq("origin_lead_id", leadId)
    .maybeSingle();

  if (byOrigin) {
    return { clientId: (byOrigin as { id: string }).id, created: false };
  }

  if (businessPhone) {
    const { data: byContact } = await serviceDb
      .schema("ayhub")
      .from("clients")
      .select("id, origin_lead_id")
      .eq("organization_id", orgId)
      .eq("contact", businessPhone)
      .maybeSingle();

    if (byContact) {
      const row = byContact as { id: string; origin_lead_id: string | null };
      if (!row.origin_lead_id) {
        await serviceDb
          .schema("ayhub")
          .from("clients")
          .update({ origin_lead_id: leadId })
          .eq("id", row.id);
      }
      return { clientId: row.id, created: false };
    }
  }

  const { data: created, error } = await serviceDb
    .schema("ayhub")
    .from("clients")
    .insert({
      organization_id: orgId,
      name: businessName,
      contact: businessPhone,
      maintenance_value: suggestedMaintenanceValue,
      status: "active",
      origin: "pipeline",
      origin_lead_id: leadId,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`ayhub client create failed: ${error?.message ?? "unknown"}`);
  }

  return { clientId: (created as { id: string }).id, created: true };
}
