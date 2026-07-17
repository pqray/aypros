import type {
  ApiErrorBody,
  BatchActionResult,
  BatchCreateLeadResponse,
  CreateLeadResponse,
  LeadContactResponse,
  LeadActivity,
  LeadDetailResponse,
  LeadNote,
  LeadStage,
  LeadStatus,
  LeadSummary,
  OrganizationMembersResponse,
  OrganizationMemberSummary,
  PipelineResponse,
} from "@aypros/types";
import { mapCategoriesToSegment, type BusinessSegment } from "@aypros/integrations";
import {
  businessIdsSchema,
  addOrganizationMemberSchema,
  createLeadContactSchema,
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
const pipelineQuerySchema = z.object({
  assignedTo: z.enum(["me"]).optional(),
});

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
  last_contact_at: string | null;
  assigned_to: string | null;
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
    raw?: Record<string, unknown> | null;
  } | null;
};

function toLeadSummary(
  row: LeadRow,
  score: { score: number; level: LeadSummary["scoreLevel"] } | null,
  members: Map<string, OrganizationMemberSummary> = new Map(),
): LeadSummary {
  const assignee = row.assigned_to ? members.get(row.assigned_to) : null;
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
    lastContactAt: row.last_contact_at,
    position: row.position,
    score: score?.score ?? null,
    scoreLevel: score?.level ?? null,
    assignedTo: row.assigned_to,
    assignedToName: assignee?.fullName ?? null,
    assignedToAvatarUrl: assignee?.avatarUrl ?? null,
    createdAt: row.created_at,
  };
}

const LEAD_FIELDS =
  "id, stage, status, potential_value, next_action, next_action_at, last_contact_at, assigned_to, position, created_at, business:businesses(id, name, address, city, state, phone, website_url, rating, review_count, categories, raw)";

const pipelineRowSchema = z.object({
  id: z.string(),
  business_id: z.string(),
  business_name: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  website_url: z.string().nullable(),
  stage: z.enum(["new", "contacted", "in_conversation", "proposal_sent", "won", "lost"]),
  status: z.enum(["active", "won", "lost", "archived"]),
  potential_value: z.coerce.number().nullable(),
  next_action: z.string().nullable(),
  next_action_at: z.string().nullable(),
  last_contact_at: z.string().nullable(),
  position: z.coerce.number().int(),
  score: z.coerce.number().int().nullable(),
  score_level: z.enum(["low", "medium", "high", "very_high"]).nullable(),
  assigned_to: z.string().nullable(),
  assigned_to_name: z.string().nullable(),
  assigned_to_avatar_url: z.string().nullable(),
  created_at: z.string(),
});

function pipelineRowToLeadSummary(row: z.infer<typeof pipelineRowSchema>): LeadSummary {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    city: row.city,
    state: row.state,
    websiteUrl: row.website_url,
    stage: row.stage,
    status: row.status,
    potentialValue: row.potential_value,
    nextAction: row.next_action,
    nextActionAt: row.next_action_at,
    lastContactAt: row.last_contact_at,
    position: row.position,
    score: row.score,
    scoreLevel: row.score_level,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name,
    assignedToAvatarUrl: row.assigned_to_avatar_url,
    createdAt: row.created_at,
  };
}

type MemberRow = {
  user_id: string;
  role: OrganizationMemberSummary["role"];
  profile:
    | { email: string | null; full_name: string | null; avatar_url: string | null }
    | Array<{ email: string | null; full_name: string | null; avatar_url: string | null }>
    | null;
};

function memberFromRow(row: MemberRow): OrganizationMemberSummary {
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
  return {
    userId: row.user_id,
    fullName: profile?.full_name ?? null,
    email: profile?.email ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    role: row.role,
  };
}

async function fetchOrgMembers(db: SupabaseClient, orgId: string): Promise<OrganizationMemberSummary[]> {
  const { data, error } = await db
    .from("organization_members")
    .select("user_id, role, profile:profiles!organization_members_user_id_fkey(email, full_name, avatar_url)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`organization members fetch failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as MemberRow[]).map(memberFromRow);
}

async function findAuthUserByEmail(db: SupabaseClient, email: string) {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  while (page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`auth users list failed: ${error.message}`);
    const found = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) return found;
    if (data.users.length < 1000) return null;
    page += 1;
  }
  return null;
}

export async function ensureAssignedMember(db: SupabaseClient, orgId: string, userId: string | null) {
  if (userId === null) return null;
  const { data, error } = await db
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`assigned member check failed: ${error.message}`);
  }
  return data ? userId : undefined;
}

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
  membersCache?: Map<string, OrganizationMemberSummary>,
): Promise<{ lead: LeadSummary; created: boolean } | null> {
  async function getMembers() {
    if (membersCache) return membersCache;
    return new Map((await fetchOrgMembers(serviceDb, orgId)).map((member) => [member.userId, member]));
  }

  const { data: existing } = await supabase
    .from("leads")
    .select(LEAD_FIELDS)
    .eq("organization_id", orgId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (existing) {
    const scores = await fetchLatestScores(supabase, [businessId]);
    return {
      lead: toLeadSummary(existing as unknown as LeadRow, scores.get(businessId) ?? null, await getMembers()),
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
      assigned_to: userId,
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
      lead: toLeadSummary(retryExisting as unknown as LeadRow, scores.get(businessId) ?? null, await getMembers()),
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

  return { lead: toLeadSummary(leadRow, null, await getMembers()), created: true };
}

export type LeadRoutesOptions = {
  serviceDb?: SupabaseClient;
};

export function registerLeadRoutes(app: FastifyInstance, options: LeadRoutesOptions = {}) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();

  app.get("/v1/organization/members", async (request, reply) => {
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      return reply.send({ items: await fetchOrgMembers(serviceDb, ctx.orgId) } satisfies OrganizationMembersResponse);
    } catch (error) {
      request.log.error({ err: error }, "organization members list failed");
      return reply.code(500).send({ error: "Erro ao carregar membros" } satisfies ApiErrorBody);
    }
  });

  app.post("/v1/organization/members", async (request, reply) => {
    const body = addOrganizationMemberSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados invalidos" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return reply.code(403).send({ error: "Sem permissao para adicionar membros" } satisfies ApiErrorBody);
    }

    try {
      const user = await findAuthUserByEmail(serviceDb, body.data.email);
      if (!user) {
        return reply.code(404).send({ error: "Usuario nao encontrado. Ele precisa se cadastrar primeiro." } satisfies ApiErrorBody);
      }

      const { data: existingMember, error: existingError } = await serviceDb
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", ctx.orgId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existingMember) {
        return reply.send({ items: await fetchOrgMembers(serviceDb, ctx.orgId) } satisfies OrganizationMembersResponse);
      }

      await serviceDb.from("profiles").upsert({
        id: user.id,
        email: user.email ?? body.data.email,
        full_name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : user.email?.split("@")[0] ?? null,
        avatar_url:
          typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
      });

      const { error } = await serviceDb.from("organization_members").insert({
        organization_id: ctx.orgId,
        user_id: user.id,
        role: body.data.role,
      });

      if (error) throw new Error(error.message);
      return reply.code(201).send({ items: await fetchOrgMembers(serviceDb, ctx.orgId) } satisfies OrganizationMembersResponse);
    } catch (error) {
      request.log.error({ err: error }, "organization member add failed");
      return reply.code(500).send({ error: "Erro ao adicionar membro" } satisfies ApiErrorBody);
    }
  });

  app.get("/v1/pipeline", async (request, reply) => {
    const query = pipelineQuerySchema.safeParse(request.query ?? {});
    if (!query.success) {
      return reply.code(400).send({ error: "Parametros invalidos" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data, error } = await ctx.supabase.rpc("get_pipeline_leads", {
      org_id: ctx.orgId,
      assigned_user_id: query.data.assignedTo === "me" ? ctx.userId : null,
    });

    if (error) {
      return reply.code(500).send({ error: "Erro ao carregar pipeline" } satisfies ApiErrorBody);
    }

    const rows = z.array(pipelineRowSchema).parse(data ?? []);

    return reply.send({
      items: rows.map(pipelineRowToLeadSummary),
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
    const members = new Map((await fetchOrgMembers(serviceDb, ctx.orgId)).map((member) => [member.userId, member]));
    for (const businessId of body.data.businessIds) {
      try {
        const result = await createOrReuseLead(ctx.supabase, serviceDb, ctx.orgId, ctx.userId, businessId, members);
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

    const [scores, membersList, notesResult, activitiesResult] = await Promise.all([
      fetchLatestScores(ctx.supabase, [business.id]),
      fetchOrgMembers(serviceDb, ctx.orgId),
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
    const members = new Map(membersList.map((member) => [member.userId, member]));

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
      lead: toLeadSummary(row, scores.get(business.id) ?? null, members),
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
        segment:
          ((business.raw?.segment ?? business.raw?.business_segment) as BusinessSegment | undefined) ??
          mapCategoriesToSegment(business.categories),
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
      .select("id, stage, status, assigned_to, business:businesses(id, name)")
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
      assigned_to: string | null;
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
    if (input.assignedTo !== undefined) {
      const assignedTo = await ensureAssignedMember(serviceDb, ctx.orgId, input.assignedTo);
      if (assignedTo === undefined) {
        return reply.code(400).send({ error: "Responsavel invalido" } satisfies ApiErrorBody);
      }
      updates.assigned_to = assignedTo;
    }
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

    if (input.assignedTo !== undefined && input.assignedTo !== current.assigned_to) {
      const membersList = await fetchOrgMembers(serviceDb, ctx.orgId);
      const nextAssignee = input.assignedTo
        ? membersList.find((member) => member.userId === input.assignedTo)
        : null;
      await logActivity(serviceDb, {
        orgId: ctx.orgId,
        actorId: ctx.userId,
        leadId: params.data.id,
        businessId: current.business?.id,
        type: "lead_assigned",
        payload: {
          from: current.assigned_to,
          to: input.assignedTo,
          to_name: nextAssignee?.fullName ?? null,
        },
      });
    }

    const row = updated as unknown as LeadRow;
    const [scores, membersList] = await Promise.all([
      row.business ? fetchLatestScores(ctx.supabase, [row.business.id]) : Promise.resolve(new Map()),
      fetchOrgMembers(serviceDb, ctx.orgId),
    ]);
    const members = new Map(membersList.map((member) => [member.userId, member]));

    return reply.send(
      toLeadSummary(row, row.business ? (scores.get(row.business.id) ?? null) : null, members),
    );
  });

  app.post("/v1/leads/:id/contacts", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id invÃ¡lido" } satisfies ApiErrorBody);
    }
    const body = createLeadContactSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Contato invÃ¡lido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const contactedAt = new Date().toISOString();
    const { data: updated, error } = await ctx.supabase
      .from("leads")
      .update({ last_contact_at: contactedAt, updated_at: contactedAt })
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .select(LEAD_FIELDS)
      .maybeSingle();

    if (error) {
      return reply.code(500).send({ error: "Erro ao registrar contato" } satisfies ApiErrorBody);
    }
    if (!updated || !(updated as unknown as LeadRow).business) {
      return reply.code(404).send({ error: "Lead nÃ£o encontrado" } satisfies ApiErrorBody);
    }

    const row = updated as unknown as LeadRow;
    const activityPayload = {
      channel: body.data.channel,
      note: body.data.note ?? null,
      business_name: row.business?.name ?? null,
    };

    const { data: activityRow, error: activityError } = await serviceDb
      .from("activities")
      .insert({
        organization_id: ctx.orgId,
        lead_id: row.id,
        business_id: row.business?.id,
        actor_id: ctx.userId,
        type: "lead_contacted",
        payload: activityPayload,
      })
      .select("id, type, payload, created_at")
      .single();

    if (activityError || !activityRow) {
      return reply.code(500).send({ error: "Erro ao registrar contato" } satisfies ApiErrorBody);
    }

    const scores = row.business ? await fetchLatestScores(ctx.supabase, [row.business.id]) : new Map();
    const activity = activityRow as {
      id: string;
      type: LeadActivity["type"];
      payload: Record<string, unknown>;
      created_at: string;
    };

    const members = new Map((await fetchOrgMembers(serviceDb, ctx.orgId)).map((member) => [member.userId, member]));

    return reply.code(201).send({
      lead: toLeadSummary(row, row.business ? (scores.get(row.business.id) ?? null) : null, members),
      activity: {
        id: activity.id,
        type: activity.type,
        payload: activity.payload,
        createdAt: activity.created_at,
      },
    } satisfies LeadContactResponse);
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
