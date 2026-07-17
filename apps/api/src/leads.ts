import type {
  ApiErrorBody,
  BatchActionResult,
  BatchCreateLeadResponse,
  CreateLeadResponse,
  LeadActivity,
  LeadDetailResponse,
  LeadNote,
  LeadStage,
  LeadStatus,
  LeadSummary,
  PipelineResponse,
} from "@aypros/types";
import {
  businessIdsSchema,
  createLeadSchema,
  createNoteSchema,
  updateLeadSchema,
  updateNoteSchema,
} from "@aypros/validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrgContext } from "./org-context";
import { createServiceRoleClient } from "./supabase";

const idParamSchema = z.object({ id: z.string().uuid() });

const leadStageLabels: Record<LeadStage, string> = {
  new: "Novo",
  contacted: "Contactado",
  in_conversation: "Em conversa",
  proposal_sent: "Proposta enviada",
  won: "Ganho",
  lost: "Perdido",
};

/**
 * Inserts `movedLeadId` into `currentOrder` (the destination column's lead
 * ids, in position order, with the moved lead already excluded) at
 * `targetIndex`. The result's array index becomes each lead's new
 * `position` — a full, simple reindex per specs/09 ("estratégia simples de
 * reindexação"), not a fractional-position scheme.
 */
export function reorderColumn(
  currentOrder: string[],
  movedLeadId: string,
  targetIndex: number,
): string[] {
  const clamped = Math.max(0, Math.min(targetIndex, currentOrder.length));
  const next = [...currentOrder];
  next.splice(clamped, 0, movedLeadId);
  return next;
}

type LeadRow = {
  id: string;
  stage: LeadStage;
  status: LeadStatus;
  potential_value: number | string | null;
  next_action: string | null;
  next_action_at: string | null;
  position: number;
  created_at: string;
  business: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    phone: string | null;
    website_url: string | null;
    rating: number | string | null;
    review_count: number | null;
    categories: string[];
  } | null;
};

function toLeadSummary(row: LeadRow, score: { score: number; level: LeadSummary["scoreLevel"] } | null): LeadSummary {
  return {
    id: row.id,
    businessId: row.business?.id ?? "",
    businessName: row.business?.name ?? "",
    city: row.business?.city ?? null,
    state: row.business?.state ?? null,
    websiteUrl: row.business?.website_url ?? null,
    stage: row.stage,
    status: row.status,
    potentialValue: row.potential_value === null ? null : Number(row.potential_value),
    nextAction: row.next_action,
    nextActionAt: row.next_action_at,
    position: row.position,
    score: score?.score ?? null,
    scoreLevel: score?.level ?? null,
    createdAt: row.created_at,
  };
}

const LEAD_FIELDS =
  "id, stage, status, potential_value, next_action, next_action_at, position, created_at, business:businesses(id, name, address, city, state, phone, website_url, rating, review_count, categories)";

async function fetchLatestScores(
  db: SupabaseClient,
  businessIds: string[],
): Promise<Map<string, { score: number; level: LeadSummary["scoreLevel"] }>> {
  const map = new Map<string, { score: number; level: LeadSummary["scoreLevel"] }>();
  if (businessIds.length === 0) return map;

  const { data } = await db
    .from("opportunity_scores")
    .select("business_id, score, level, created_at")
    .in("business_id", businessIds)
    .order("created_at", { ascending: false });

  for (const row of (data ?? []) as Array<{
    business_id: string;
    score: number;
    level: LeadSummary["scoreLevel"];
  }>) {
    // Rows arrive newest-first; keep only the first (latest) score per business.
    if (!map.has(row.business_id)) {
      map.set(row.business_id, { score: row.score, level: row.level });
    }
  }
  return map;
}

async function logActivity(
  db: SupabaseClient,
  params: {
    orgId: string;
    actorId: string;
    leadId: string;
    businessId?: string;
    type: LeadActivity["type"];
    payload: Record<string, unknown>;
  },
) {
  await db.from("activities").insert({
    organization_id: params.orgId,
    lead_id: params.leadId,
    business_id: params.businessId,
    actor_id: params.actorId,
    type: params.type,
    payload: params.payload,
  });
}

async function createOrReuseLead(
  supabase: SupabaseClient,
  serviceDb: SupabaseClient,
  orgId: string,
  userId: string,
  businessId: string,
): Promise<{ lead: LeadSummary; created: boolean } | null> {
  const { data: existing } = await supabase
    .from("leads")
    .select(LEAD_FIELDS)
    .eq("organization_id", orgId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing) {
    const scores = await fetchLatestScores(supabase, [businessId]);
    return {
      lead: toLeadSummary(existing as unknown as LeadRow, scores.get(businessId) ?? null),
      created: false,
    };
  }

  // Position: append to the end of the "new" column.
  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("stage", "new");

  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      organization_id: orgId,
      business_id: businessId,
      stage: "new",
      status: "active",
      position: count ?? 0,
      created_by: userId,
    })
    .select(LEAD_FIELDS)
    .single();

  if (error || !created) {
    // Most likely a race on the (organization_id, business_id) unique constraint —
    // another request created the lead first. Reuse it instead of failing.
    const { data: retryExisting } = await supabase
      .from("leads")
      .select(LEAD_FIELDS)
      .eq("organization_id", orgId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (!retryExisting) return null;
    const scores = await fetchLatestScores(supabase, [businessId]);
    return {
      lead: toLeadSummary(retryExisting as unknown as LeadRow, scores.get(businessId) ?? null),
      created: false,
    };
  }

  const leadRow = created as unknown as LeadRow;
  await logActivity(serviceDb, {
    orgId,
    actorId: userId,
    leadId: leadRow.id,
    businessId,
    type: "lead_created",
    payload: { business_name: leadRow.business?.name ?? null },
  });

  return { lead: toLeadSummary(leadRow, null), created: true };
}

export type LeadRoutesOptions = {
  serviceDb?: SupabaseClient;
};

export function registerLeadRoutes(app: FastifyInstance, options: LeadRoutesOptions = {}) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();

  app.get("/v1/pipeline", async (request, reply) => {
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data, error } = await ctx.supabase
      .from("leads")
      .select(LEAD_FIELDS)
      .eq("organization_id", ctx.orgId)
      .in("status", ["active", "won", "lost"])
      .order("position", { ascending: true });

    if (error) {
      return reply.code(500).send({ error: "Erro ao carregar pipeline" } satisfies ApiErrorBody);
    }

    const rows = (data ?? []) as unknown as LeadRow[];
    const businessIds = rows.map((row) => row.business?.id).filter((id): id is string => Boolean(id));
    const scores = await fetchLatestScores(ctx.supabase, businessIds);

    return reply.send({
      items: rows.map((row) => toLeadSummary(row, row.business ? (scores.get(row.business.id) ?? null) : null)),
    } satisfies PipelineResponse);
  });

  app.post("/v1/leads", async (request, reply) => {
    const body = createLeadSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Empresa inválida" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const result = await createOrReuseLead(ctx.supabase, serviceDb, ctx.orgId, ctx.userId, body.data.businessId);
    if (!result) {
      return reply.code(500).send({ error: "Erro ao criar lead" } satisfies ApiErrorBody);
    }

    return reply
      .code(result.created ? 201 : 200)
      .send({ lead: result.lead, created: result.created } satisfies CreateLeadResponse);
  });

  app.post("/v1/leads/batch", async (request, reply) => {
    const body = businessIdsSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Seleção inválida" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const results: BatchActionResult[] = [];
    for (const businessId of body.data.businessIds) {
      try {
        const result = await createOrReuseLead(ctx.supabase, serviceDb, ctx.orgId, ctx.userId, businessId);
        results.push({ businessId, ok: result !== null, error: result ? undefined : "not_found" });
      } catch (error) {
        results.push({
          businessId,
          ok: false,
          error: error instanceof Error ? error.message : "lead_create_failed",
        });
      }
    }

    return reply.send({ results } satisfies BatchCreateLeadResponse);
  });

  app.get("/v1/leads/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data: leadRow, error: leadError } = await ctx.supabase
      .from("leads")
      .select(LEAD_FIELDS)
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (leadError) {
      return reply.code(500).send({ error: "Erro ao carregar lead" } satisfies ApiErrorBody);
    }
    if (!leadRow || !(leadRow as unknown as LeadRow).business) {
      return reply.code(404).send({ error: "Lead não encontrado" } satisfies ApiErrorBody);
    }

    const row = leadRow as unknown as LeadRow;
    const business = row.business!;

    const [scores, notesResult, activitiesResult] = await Promise.all([
      fetchLatestScores(ctx.supabase, [business.id]),
      ctx.supabase
        .from("notes")
        .select("id, lead_id, author_id, content, created_at, updated_at")
        .eq("lead_id", row.id)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("activities")
        .select("id, type, payload, created_at")
        .eq("lead_id", row.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (notesResult.error || activitiesResult.error) {
      return reply.code(500).send({ error: "Erro ao carregar lead" } satisfies ApiErrorBody);
    }

    const noteRows = (notesResult.data ?? []) as Array<{
      id: string;
      lead_id: string;
      author_id: string;
      content: string;
      created_at: string;
      updated_at: string;
    }>;

    const authorIds = [...new Set(noteRows.map((note) => note.author_id))];
    const { data: profileRows } =
      authorIds.length > 0
        ? await serviceDb.from("profiles").select("id, full_name").in("id", authorIds)
        : { data: [] as Array<{ id: string; full_name: string | null }> };
    const authorNames = new Map(
      (profileRows ?? []).map((profile) => [profile.id, profile.full_name] as const),
    );

    const notes: LeadNote[] = noteRows.map((note) => ({
      id: note.id,
      leadId: note.lead_id,
      authorId: note.author_id,
      authorName: authorNames.get(note.author_id) ?? null,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }));

    const activities: LeadActivity[] = ((activitiesResult.data ?? []) as Array<{
      id: string;
      type: LeadActivity["type"];
      payload: Record<string, unknown>;
      created_at: string;
    }>).map((activity) => ({
      id: activity.id,
      type: activity.type,
      payload: activity.payload,
      createdAt: activity.created_at,
    }));

    return reply.send({
      lead: toLeadSummary(row, scores.get(business.id) ?? null),
      business: {
        id: business.id,
        name: business.name,
        address: business.address,
        city: business.city,
        state: business.state,
        phone: business.phone,
        websiteUrl: business.website_url,
        rating: business.rating === null ? null : Number(business.rating),
        reviewCount: business.review_count,
        categories: business.categories,
      },
      notes,
      activities,
    } satisfies LeadDetailResponse);
  });

  app.patch("/v1/leads/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = updateLeadSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data: currentRow, error: currentError } = await ctx.supabase
      .from("leads")
      .select("id, stage, status, business:businesses(id, name)")
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (currentError) {
      return reply.code(500).send({ error: "Erro ao carregar lead" } satisfies ApiErrorBody);
    }
    if (!currentRow) {
      return reply.code(404).send({ error: "Lead não encontrado" } satisfies ApiErrorBody);
    }

    const current = currentRow as unknown as {
      id: string;
      stage: LeadStage;
      status: LeadStatus;
      business: { id: string; name: string } | null;
    };

    const input = body.data;
    const nextStage = input.stage ?? current.stage;
    const stageChanged = input.stage !== undefined && input.stage !== current.stage;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.potentialValue !== undefined) updates.potential_value = input.potentialValue;
    if (input.nextAction !== undefined) updates.next_action = input.nextAction;
    if (input.nextActionAt !== undefined) updates.next_action_at = input.nextActionAt;
    if (input.status !== undefined) updates.status = input.status;
    if (input.stage !== undefined) {
      updates.stage = input.stage;
      // Moving into won/lost updates lead_status to match (specs/12); moving back out
      // of a terminal stage reactivates the lead unless the caller set status explicitly.
      if (input.status === undefined) {
        if (input.stage === "won" || input.stage === "lost") {
          updates.status = input.stage;
        } else if (current.status === "won" || current.status === "lost") {
          updates.status = "active";
        }
      }
    }

    if (input.stage !== undefined || input.position !== undefined) {
      const { data: siblingRows } = await ctx.supabase
        .from("leads")
        .select("id")
        .eq("organization_id", ctx.orgId)
        .eq("stage", nextStage)
        .neq("id", params.data.id)
        .order("position", { ascending: true });

      const siblingIds = (siblingRows ?? []).map((row) => (row as { id: string }).id);
      const targetIndex = input.position ?? siblingIds.length;
      const ordered = reorderColumn(siblingIds, params.data.id, targetIndex);

      updates.position = ordered.indexOf(params.data.id);

      const reindexUpdates = ordered
        .map((id, index) => ({ id, position: index }))
        .filter(({ id, position }) => id !== params.data.id || position !== updates.position);

      await Promise.all(
        reindexUpdates
          .filter(({ id }) => id !== params.data.id)
          .map(({ id, position }) =>
            ctx.supabase.from("leads").update({ position }).eq("organization_id", ctx.orgId).eq("id", id),
          ),
      );
    }

    const { data: updated, error: updateError } = await ctx.supabase
      .from("leads")
      .update(updates)
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .select(LEAD_FIELDS)
      .single();

    if (updateError || !updated) {
      return reply.code(500).send({ error: "Erro ao atualizar lead" } satisfies ApiErrorBody);
    }

    if (stageChanged) {
      await logActivity(serviceDb, {
        orgId: ctx.orgId,
        actorId: ctx.userId,
        leadId: params.data.id,
        businessId: current.business?.id,
        type: "lead_stage_changed",
        payload: {
          from: current.stage,
          to: nextStage,
          from_label: leadStageLabels[current.stage],
          to_label: leadStageLabels[nextStage],
        },
      });
    }

    const row = updated as unknown as LeadRow;
    const scores = row.business ? await fetchLatestScores(ctx.supabase, [row.business.id]) : new Map();

    return reply.send(
      toLeadSummary(row, row.business ? (scores.get(row.business.id) ?? null) : null),
    );
  });

  app.post("/v1/leads/:id/notes", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = createNoteSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Nota inválida" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data: lead } = await ctx.supabase
      .from("leads")
      .select("id, business_id")
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (!lead) {
      return reply.code(404).send({ error: "Lead não encontrado" } satisfies ApiErrorBody);
    }

    const { data: created, error } = await ctx.supabase
      .from("notes")
      .insert({
        lead_id: params.data.id,
        organization_id: ctx.orgId,
        author_id: ctx.userId,
        content: body.data.content,
      })
      .select("id, lead_id, author_id, content, created_at, updated_at")
      .single();

    if (error || !created) {
      return reply.code(500).send({ error: "Erro ao criar nota" } satisfies ApiErrorBody);
    }

    await logActivity(serviceDb, {
      orgId: ctx.orgId,
      actorId: ctx.userId,
      leadId: params.data.id,
      businessId: (lead as { business_id: string }).business_id,
      type: "note_created",
      payload: {},
    });

    const note = created as {
      id: string;
      lead_id: string;
      author_id: string;
      content: string;
      created_at: string;
      updated_at: string;
    };

    return reply.code(201).send({
      id: note.id,
      leadId: note.lead_id,
      authorId: note.author_id,
      authorName: null,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    } satisfies LeadNote);
  });

  app.patch("/v1/notes/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = updateNoteSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Nota inválida" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data: updated, error } = await ctx.supabase
      .from("notes")
      .update({ content: body.data.content, updated_at: new Date().toISOString() })
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .select("id, lead_id, author_id, content, created_at, updated_at")
      .maybeSingle();

    if (error) {
      return reply.code(500).send({ error: "Erro ao atualizar nota" } satisfies ApiErrorBody);
    }
    if (!updated) {
      return reply.code(404).send({ error: "Nota não encontrada" } satisfies ApiErrorBody);
    }

    const note = updated as {
      id: string;
      lead_id: string;
      author_id: string;
      content: string;
      created_at: string;
      updated_at: string;
    };

    return reply.send({
      id: note.id,
      leadId: note.lead_id,
      authorId: note.author_id,
      authorName: null,
      content: note.content,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    } satisfies LeadNote);
  });

  app.delete("/v1/notes/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { error } = await ctx.supabase
      .from("notes")
      .delete()
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id);

    if (error) {
      return reply.code(500).send({ error: "Erro ao remover nota" } satisfies ApiErrorBody);
    }

    return reply.code(204).send();
  });
}
