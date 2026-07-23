import type {
  ApiErrorBody,
  AyhubClientDetail,
  AyhubClientMargin,
  AyhubClientSummary,
  AyhubClientsResponse,
  AyhubContentBlock,
  AyhubDashboardResponse,
  AyhubFrequency,
  AyhubPayment,
  AyhubPublishSiteResponse,
  AyhubRenewalAlert,
  AyhubSiteCost,
  AyhubSiteDetail,
  AyhubSiteKeySummary,
  AyhubSiteSummary,
  CreateAyhubSiteKeyResponse,
} from "@aypros/types";
import {
  createAyhubClientSchema,
  createAyhubContentBlockSchema,
  createAyhubPaymentSchema,
  createAyhubSiteCostSchema,
  createAyhubSiteSchema,
  updateAyhubClientSchema,
  updateAyhubContentBlockSchema,
  updateAyhubSiteSchema,
} from "@aypros/validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { generateSiteKey } from "./ayhub-service";
import { requireOrgContext, type OrgRequestContext } from "./org-context";
import { timed } from "./timing";

const idParamSchema = z.object({ id: z.string().uuid() });
const nestedIdParamSchema = z.object({ id: z.string().uuid(), keyId: z.string().uuid() });

function defaultSeoBlocks(clientName: string) {
  return [
    { key: "seo.title", type: "text" as const, draft_value: clientName },
    { key: "seo.description", type: "text" as const, draft_value: "" },
    { key: "seo.og_image", type: "image" as const, draft_value: null },
  ];
}

function monthlyEquivalent(amount: number, frequency: AyhubFrequency): number {
  if (frequency === "monthly") return amount;
  if (frequency === "yearly") return amount / 12;
  return 0;
}

function daysBetweenDates(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.ceil((toUtc - fromUtc) / (24 * 60 * 60 * 1000));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : `${value}T00:00:00Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnlyTime(value: string | null | undefined): number | null {
  const date = parseDateOnly(value);
  if (!date) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function nextMonthlyAnniversary(startDate: string, now: Date): Date {
  const start = parseDateOnly(startDate);
  if (!start) {
    throw new RangeError(`Invalid start date: ${startDate}`);
  }
  const day = start.getUTCDate();
  const lastDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.min(day, lastDayOfMonth)));
  const todayTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (candidate.getTime() < todayTime) {
    candidate.setUTCMonth(candidate.getUTCMonth() + 1);
    const nextMonthLastDay = new Date(
      Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, 0),
    ).getUTCDate();
    candidate.setUTCDate(Math.min(day, nextMonthLastDay));
  }

  return candidate;
}

function requireOwnerOrAdmin(ctx: OrgRequestContext, reply: FastifyReply): boolean {
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    void reply.code(403).send({ error: "AYhub é restrito a owners e admins da organização" } satisfies ApiErrorBody);
    return false;
  }
  return true;
}

type ClientRow = {
  id: string;
  name: string;
  contact: string | null;
  maintenance_value: number | string | null;
  status: AyhubClientSummary["status"];
  origin: AyhubClientSummary["origin"];
  start_date: string;
  origin_lead_id: string | null;
  created_at: string;
};

type SiteRow = {
  id: string;
  client_id: string;
  slug: string;
  domain: string | null;
  domain_owner: AyhubSiteSummary["domainOwner"];
  delivery_date: string | null;
  status: AyhubSiteSummary["status"];
  created_at: string;
};

type CostRow = {
  id: string;
  site_id: string;
  type: AyhubSiteCost["type"];
  amount: number | string;
  frequency: AyhubFrequency;
  next_renewal: string | null;
  payment_owner: AyhubSiteCost["paymentOwner"];
  created_at: string;
};

type PaymentRow = {
  id: string;
  client_id: string;
  amount: number | string;
  date: string;
  created_at: string;
};

type ContentBlockRow = {
  id: string;
  site_id: string;
  key: string;
  type: AyhubContentBlock["type"];
  draft_value: unknown;
  published_value: unknown;
  status: AyhubContentBlock["status"];
  updated_at: string;
  published_at: string | null;
};

type SiteKeyRow = {
  id: string;
  site_id: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
};

function toClientSummary(row: ClientRow, sitesCount: number): AyhubClientSummary {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    maintenanceValue: row.maintenance_value === null ? null : Number(row.maintenance_value),
    status: row.status,
    origin: row.origin,
    startDate: row.start_date,
    sitesCount,
    createdAt: row.created_at,
  };
}

function toSiteSummary(row: SiteRow, costs: CostRow[]): AyhubSiteSummary {
  const siteCosts = costs.filter((cost) => cost.site_id === row.id);
  const monthlyCostTotal = siteCosts.reduce(
    (sum, cost) => sum + monthlyEquivalent(Number(cost.amount), cost.frequency),
    0,
  );
  const renewalDates = siteCosts.map((cost) => cost.next_renewal).filter((date): date is string => Boolean(date));
  const nextRenewal = renewalDates.length > 0 ? (renewalDates.sort()[0] ?? null) : null;

  return {
    id: row.id,
    clientId: row.client_id,
    slug: row.slug,
    domain: row.domain,
    domainOwner: row.domain_owner,
    deliveryDate: row.delivery_date,
    status: row.status,
    monthlyCostTotal,
    nextRenewal,
    createdAt: row.created_at,
  };
}

function toSiteCost(row: CostRow): AyhubSiteCost {
  return {
    id: row.id,
    siteId: row.site_id,
    type: row.type,
    amount: Number(row.amount),
    frequency: row.frequency,
    nextRenewal: row.next_renewal,
    paymentOwner: row.payment_owner,
    createdAt: row.created_at,
  };
}

function toContentBlock(row: ContentBlockRow): AyhubContentBlock {
  return {
    id: row.id,
    siteId: row.site_id,
    key: row.key,
    type: row.type,
    draftValue: row.draft_value,
    publishedValue: row.published_value,
    status: row.status,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function toPayment(row: PaymentRow): AyhubPayment {
  return {
    id: row.id,
    clientId: row.client_id,
    amount: Number(row.amount),
    date: row.date,
    createdAt: row.created_at,
  };
}

function toSiteKeySummary(row: SiteKeyRow): AyhubSiteKeySummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at,
  };
}

export type AyhubRoutesOptions = {
  serviceDb?: SupabaseClient;
};

// Todas as rotas usam ctx.supabase (RLS-scoped) — o RLS de ayhub.* já
// restringe a owner/admin, então não há escrita cross-tenant que exija
// service role aqui. O parâmetro fica só para manter o padrão de DI dos
// outros módulos de rota (specs/17).
export function registerAyhubRoutes(app: FastifyInstance, _options: AyhubRoutesOptions = {}) {
  app.get("/v1/ayhub/clients", async (request, reply) => {
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const { data: clients, error } = await ctx.supabase
      .schema("ayhub")
      .from("clients")
      .select("id, name, contact, maintenance_value, status, origin, start_date, origin_lead_id, created_at")
      .eq("organization_id", ctx.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return reply.code(500).send({ error: "Erro ao carregar clientes" } satisfies ApiErrorBody);
    }

    const rows = (clients ?? []) as ClientRow[];
    const { data: sites } = await ctx.supabase
      .schema("ayhub")
      .from("sites")
      .select("client_id")
      .eq("organization_id", ctx.orgId);

    const sitesCountByClient = new Map<string, number>();
    for (const site of (sites ?? []) as Array<{ client_id: string }>) {
      sitesCountByClient.set(site.client_id, (sitesCountByClient.get(site.client_id) ?? 0) + 1);
    }

    return reply.send({
      items: rows.map((row) => toClientSummary(row, sitesCountByClient.get(row.id) ?? 0)),
    } satisfies AyhubClientsResponse);
  });

  app.post("/v1/ayhub/clients", async (request, reply) => {
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const body = createAyhubClientSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }

    const { data: created, error } = await ctx.supabase
      .schema("ayhub")
      .from("clients")
      .insert({
        organization_id: ctx.orgId,
        name: body.data.name,
        contact: body.data.contact ?? null,
        maintenance_value: body.data.maintenanceValue ?? null,
        status: body.data.status ?? "active",
        origin: "manual",
      })
      .select("id, name, contact, maintenance_value, status, origin, start_date, origin_lead_id, created_at")
      .single();

    if (error || !created) {
      return reply.code(500).send({ error: "Erro ao criar cliente" } satisfies ApiErrorBody);
    }

    return reply.code(201).send(toClientSummary(created as ClientRow, 0));
  });

  app.get("/v1/ayhub/clients/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    // sites/costs/payments só dependem do id da URL (== client.id), não do
    // conteúdo do cliente — disparam junto com o fetch do cliente em vez de
    // esperar ele resolver primeiro, cortando um round-trip sequencial.
    // Só a busca da empresa de origem precisa mesmo esperar (depende de
    // client.origin_lead_id, que só existe depois do fetch do cliente).
    const [clientResult, sitesResult, costsResult, paymentsResult] = await timed(
      request,
      "ayhub.client.detail",
      () =>
        Promise.all([
          ctx.supabase
            .schema("ayhub")
            .from("clients")
            .select("id, name, contact, maintenance_value, status, origin, start_date, origin_lead_id, created_at")
            .eq("organization_id", ctx.orgId)
            .eq("id", params.data.id)
            .maybeSingle(),
          ctx.supabase
            .schema("ayhub")
            .from("sites")
            .select("id, client_id, slug, domain, domain_owner, delivery_date, status, created_at")
            .eq("organization_id", ctx.orgId)
            .eq("client_id", params.data.id)
            .order("created_at", { ascending: false }),
          ctx.supabase
            .schema("ayhub")
            .from("site_costs")
            .select("id, site_id, type, amount, frequency, next_renewal, payment_owner, created_at")
            .eq("organization_id", ctx.orgId),
          ctx.supabase
            .schema("ayhub")
            .from("payments")
            .select("id, client_id, amount, date, created_at")
            .eq("organization_id", ctx.orgId)
            .eq("client_id", params.data.id)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(5),
        ]),
    );

    if (clientResult.error) {
      return reply.code(500).send({ error: "Erro ao carregar cliente" } satisfies ApiErrorBody);
    }
    if (!clientResult.data) {
      return reply.code(404).send({ error: "Cliente não encontrado" } satisfies ApiErrorBody);
    }

    const client = clientResult.data as ClientRow;

    const originBusiness = client.origin_lead_id
      ? await timed(request, "ayhub.client.originLead", () =>
          ctx.supabase
            .from("leads")
            .select("business:businesses(name)")
            .eq("organization_id", ctx.orgId)
            .eq("id", client.origin_lead_id)
            .maybeSingle(),
        )
      : { data: null };

    const costRows = (costsResult.data ?? []) as CostRow[];
    const siteRows = (sitesResult.data ?? []) as SiteRow[];
    const paymentRows = (paymentsResult.data ?? []) as PaymentRow[];
    const originData = originBusiness.data as { business: { name: string } | null } | null;

    return reply.send({
      client: toClientSummary(client, siteRows.length),
      originLeadBusinessName: originData?.business?.name ?? null,
      sites: siteRows.map((row) => toSiteSummary(row, costRows)),
      payments: paymentRows.map(toPayment),
    } satisfies AyhubClientDetail);
  });

  app.patch("/v1/ayhub/clients/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = updateAyhubClientSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const updates: Record<string, unknown> = {};
    if (body.data.name !== undefined) updates.name = body.data.name;
    if (body.data.contact !== undefined) updates.contact = body.data.contact;
    if (body.data.maintenanceValue !== undefined) updates.maintenance_value = body.data.maintenanceValue;
    if (body.data.status !== undefined) updates.status = body.data.status;

    const { data: updated, error } = await ctx.supabase
      .schema("ayhub")
      .from("clients")
      .update(updates)
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .select("id, name, contact, maintenance_value, status, origin, start_date, origin_lead_id, created_at")
      .maybeSingle();

    if (error) {
      return reply.code(500).send({ error: "Erro ao atualizar cliente" } satisfies ApiErrorBody);
    }
    if (!updated) {
      return reply.code(404).send({ error: "Cliente não encontrado" } satisfies ApiErrorBody);
    }

    const { count } = await ctx.supabase
      .schema("ayhub")
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.orgId)
      .eq("client_id", params.data.id);

    return reply.send(toClientSummary(updated as ClientRow, count ?? 0));
  });

  app.post("/v1/ayhub/clients/:id/sites", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = createAyhubSiteSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const { data: client } = await ctx.supabase
      .schema("ayhub")
      .from("clients")
      .select("id, name, origin_lead_id")
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (!client) {
      return reply.code(404).send({ error: "Cliente não encontrado" } satisfies ApiErrorBody);
    }

    const { data: created, error } = await ctx.supabase
      .schema("ayhub")
      .from("sites")
      .insert({
        organization_id: ctx.orgId,
        client_id: params.data.id,
        slug: body.data.slug,
        domain: body.data.domain ?? null,
        domain_owner: body.data.domainOwner ?? "me",
        delivery_date: body.data.deliveryDate ?? null,
        status: body.data.status ?? "development",
      })
      .select("id, client_id, slug, domain, domain_owner, delivery_date, status, created_at")
      .single();

    if (error || !created) {
      const message = error?.code === "23505" ? "Já existe um site com esse slug" : "Erro ao criar site";
      return reply.code(error?.code === "23505" ? 409 : 500).send({ error: message } satisfies ApiErrorBody);
    }

    const site = created as SiteRow;
    const clientTyped = client as { id: string; name: string; origin_lead_id: string | null };

    // Blocos de SEO obrigatórios pré-criados na criação do site (specs/21).
    await ctx.supabase
      .schema("ayhub")
      .from("content_blocks")
      .insert(
        defaultSeoBlocks(clientTyped.name).map((block) => ({
          organization_id: ctx.orgId,
          site_id: site.id,
          ...block,
        })),
      );

    // Primeiro site de um cliente vindo da pipeline: reaproveita os valores
    // de domínio/hospedagem já preenchidos no estimador de custo do lead
    // (specs/21), pra não obrigar a recadastrar do zero no AYhub.
    let seededCosts: CostRow[] = [];
    if (clientTyped.origin_lead_id) {
      const { count: existingSitesCount } = await ctx.supabase
        .schema("ayhub")
        .from("sites")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ctx.orgId)
        .eq("client_id", params.data.id)
        .neq("id", site.id);

      if ((existingSitesCount ?? 0) === 0) {
        const { data: originLead } = await ctx.supabase
          .from("leads")
          .select("domain_cost_annual, hosting_cost_monthly")
          .eq("organization_id", ctx.orgId)
          .eq("id", clientTyped.origin_lead_id)
          .maybeSingle();

        const lead = originLead as { domain_cost_annual: number | string; hosting_cost_monthly: number | string } | null;
        if (lead) {
          const domainCostAnnual = Number(lead.domain_cost_annual);
          const hostingCostMonthly = Number(lead.hosting_cost_monthly);
          const rowsToInsert: Array<{ type: "domain" | "hosting"; amount: number; frequency: "yearly" | "monthly" }> = [];
          if (domainCostAnnual > 0) {
            rowsToInsert.push({ type: "domain", amount: domainCostAnnual, frequency: "yearly" });
          }
          if (hostingCostMonthly > 0) {
            rowsToInsert.push({ type: "hosting", amount: hostingCostMonthly, frequency: "monthly" });
          }

          if (rowsToInsert.length > 0) {
            const { data: insertedCosts } = await ctx.supabase
              .schema("ayhub")
              .from("site_costs")
              .insert(
                rowsToInsert.map((row) => ({
                  organization_id: ctx.orgId,
                  site_id: site.id,
                  type: row.type,
                  amount: row.amount,
                  frequency: row.frequency,
                  payment_owner: "me",
                })),
              )
              .select("id, site_id, type, amount, frequency, next_renewal, payment_owner, created_at");
            seededCosts = (insertedCosts ?? []) as CostRow[];
          }
        }
      }
    }

    return reply.code(201).send(toSiteSummary(site, seededCosts));
  });

  app.get("/v1/ayhub/sites/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    // costs/blocks/keys só dependem do id da URL (== site.id) — disparam
    // junto com o fetch do site em vez de esperar ele resolver primeiro. Só
    // o nome do cliente precisa mesmo esperar (depende de site.client_id).
    const [siteResult, costsResult, blocksResult, keysResult] = await timed(request, "ayhub.site.detail", () =>
      Promise.all([
        ctx.supabase
          .schema("ayhub")
          .from("sites")
          .select("id, client_id, slug, domain, domain_owner, delivery_date, status, created_at")
          .eq("organization_id", ctx.orgId)
          .eq("id", params.data.id)
          .maybeSingle(),
        ctx.supabase
          .schema("ayhub")
          .from("site_costs")
          .select("id, site_id, type, amount, frequency, next_renewal, payment_owner, created_at")
          .eq("organization_id", ctx.orgId)
          .eq("site_id", params.data.id)
          .order("next_renewal", { ascending: true }),
        ctx.supabase
          .schema("ayhub")
          .from("content_blocks")
          .select("id, site_id, key, type, draft_value, published_value, status, updated_at, published_at")
          .eq("organization_id", ctx.orgId)
          .eq("site_id", params.data.id)
          .order("key", { ascending: true }),
        ctx.supabase
          .schema("ayhub")
          .from("site_keys")
          .select("id, site_id, created_at, revoked_at, last_used_at")
          .eq("organization_id", ctx.orgId)
          .eq("site_id", params.data.id)
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]),
    );

    if (siteResult.error) {
      return reply.code(500).send({ error: "Erro ao carregar site" } satisfies ApiErrorBody);
    }
    if (!siteResult.data) {
      return reply.code(404).send({ error: "Site não encontrado" } satisfies ApiErrorBody);
    }

    const site = siteResult.data as SiteRow;

    const { data: client } = await timed(request, "ayhub.site.clientName", () =>
      ctx.supabase
        .schema("ayhub")
        .from("clients")
        .select("name")
        .eq("organization_id", ctx.orgId)
        .eq("id", site.client_id)
        .maybeSingle(),
    );

    const costRows = (costsResult.data ?? []) as CostRow[];
    const blockRows = (blocksResult.data ?? []) as ContentBlockRow[];
    const hasUnpublishedChanges = blockRows.some(
      (block) => JSON.stringify(block.draft_value) !== JSON.stringify(block.published_value),
    );

    return reply.send({
      site: toSiteSummary(site, costRows),
      clientName: (client as { name: string } | null)?.name ?? "",
      costs: costRows.map(toSiteCost),
      contentBlocks: blockRows.map(toContentBlock),
      hasUnpublishedChanges,
      activeKey: keysResult.data ? toSiteKeySummary(keysResult.data as SiteKeyRow) : null,
    } satisfies AyhubSiteDetail);
  });

  app.patch("/v1/ayhub/sites/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = updateAyhubSiteSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const updates: Record<string, unknown> = {};
    if (body.data.slug !== undefined) updates.slug = body.data.slug;
    if (body.data.domain !== undefined) updates.domain = body.data.domain;
    if (body.data.domainOwner !== undefined) updates.domain_owner = body.data.domainOwner;
    if (body.data.deliveryDate !== undefined) updates.delivery_date = body.data.deliveryDate;
    if (body.data.status !== undefined) updates.status = body.data.status;

    const { data: updated, error } = await ctx.supabase
      .schema("ayhub")
      .from("sites")
      .update(updates)
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .select("id, client_id, slug, domain, domain_owner, delivery_date, status, created_at")
      .maybeSingle();

    if (error) {
      const message = error.code === "23505" ? "Já existe um site com esse slug" : "Erro ao atualizar site";
      return reply.code(error.code === "23505" ? 409 : 500).send({ error: message } satisfies ApiErrorBody);
    }
    if (!updated) {
      return reply.code(404).send({ error: "Site não encontrado" } satisfies ApiErrorBody);
    }

    const { data: costs } = await ctx.supabase
      .schema("ayhub")
      .from("site_costs")
      .select("id, site_id, type, amount, frequency, next_renewal, payment_owner, created_at")
      .eq("organization_id", ctx.orgId)
      .eq("site_id", params.data.id);

    return reply.send(toSiteSummary(updated as SiteRow, (costs ?? []) as CostRow[]));
  });

  app.post("/v1/ayhub/sites/:id/keys", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const { data: site } = await ctx.supabase
      .schema("ayhub")
      .from("sites")
      .select("id")
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (!site) {
      return reply.code(404).send({ error: "Site não encontrado" } satisfies ApiErrorBody);
    }

    // Uma chave ativa por vez: gerar uma nova revoga a anterior.
    await ctx.supabase
      .schema("ayhub")
      .from("site_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("organization_id", ctx.orgId)
      .eq("site_id", params.data.id)
      .is("revoked_at", null);

    const { plaintext, hash } = generateSiteKey();
    const { data: created, error } = await ctx.supabase
      .schema("ayhub")
      .from("site_keys")
      .insert({ organization_id: ctx.orgId, site_id: params.data.id, key_hash: hash })
      .select("id, site_id, created_at, revoked_at, last_used_at")
      .single();

    if (error || !created) {
      return reply.code(500).send({ error: "Erro ao gerar chave" } satisfies ApiErrorBody);
    }

    return reply.code(201).send({
      key: plaintext,
      keyInfo: toSiteKeySummary(created as SiteKeyRow),
    } satisfies CreateAyhubSiteKeyResponse);
  });

  app.post("/v1/ayhub/sites/:id/keys/:keyId/revoke", async (request, reply) => {
    const params = nestedIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const { data: updated, error } = await ctx.supabase
      .schema("ayhub")
      .from("site_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("organization_id", ctx.orgId)
      .eq("site_id", params.data.id)
      .eq("id", params.data.keyId)
      .select("id")
      .maybeSingle();

    if (error) {
      return reply.code(500).send({ error: "Erro ao revogar chave" } satisfies ApiErrorBody);
    }
    if (!updated) {
      return reply.code(404).send({ error: "Chave não encontrada" } satisfies ApiErrorBody);
    }

    return reply.code(204).send();
  });

  app.post("/v1/ayhub/sites/:id/costs", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = createAyhubSiteCostSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const { data: site } = await ctx.supabase
      .schema("ayhub")
      .from("sites")
      .select("id")
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (!site) {
      return reply.code(404).send({ error: "Site não encontrado" } satisfies ApiErrorBody);
    }

    const { data: created, error } = await ctx.supabase
      .schema("ayhub")
      .from("site_costs")
      .insert({
        organization_id: ctx.orgId,
        site_id: params.data.id,
        type: body.data.type,
        amount: body.data.amount,
        frequency: body.data.frequency,
        next_renewal: body.data.nextRenewal ?? null,
        payment_owner: body.data.paymentOwner ?? "me",
      })
      .select("id, site_id, type, amount, frequency, next_renewal, payment_owner, created_at")
      .single();

    if (error || !created) {
      return reply.code(500).send({ error: "Erro ao adicionar custo" } satisfies ApiErrorBody);
    }

    return reply.code(201).send(toSiteCost(created as CostRow));
  });

  app.delete("/v1/ayhub/costs/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const { error } = await ctx.supabase
      .schema("ayhub")
      .from("site_costs")
      .delete()
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id);

    if (error) {
      return reply.code(500).send({ error: "Erro ao remover custo" } satisfies ApiErrorBody);
    }

    return reply.code(204).send();
  });

  app.post("/v1/ayhub/sites/:id/content-blocks", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = createAyhubContentBlockSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const { data: site } = await ctx.supabase
      .schema("ayhub")
      .from("sites")
      .select("id")
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (!site) {
      return reply.code(404).send({ error: "Site não encontrado" } satisfies ApiErrorBody);
    }

    const { data: created, error } = await ctx.supabase
      .schema("ayhub")
      .from("content_blocks")
      .insert({
        organization_id: ctx.orgId,
        site_id: params.data.id,
        key: body.data.key,
        type: body.data.type,
        draft_value: body.data.draftValue ?? (body.data.type === "list" ? [] : body.data.type === "text" ? "" : null),
      })
      .select("id, site_id, key, type, draft_value, published_value, status, updated_at, published_at")
      .single();

    if (error || !created) {
      const message = error?.code === "23505" ? "Já existe um bloco com essa chave" : "Erro ao criar bloco";
      return reply.code(error?.code === "23505" ? 409 : 500).send({ error: message } satisfies ApiErrorBody);
    }

    return reply.code(201).send(toContentBlock(created as ContentBlockRow));
  });

  app.patch("/v1/ayhub/content-blocks/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = updateAyhubContentBlockSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    // Edição sempre grava no rascunho — valor publicado só muda ao publicar
    // (specs/21, seção "Conteúdo: SEO e rascunho/publicado").
    const { data: updated, error } = await ctx.supabase
      .schema("ayhub")
      .from("content_blocks")
      .update({ draft_value: body.data.draftValue, updated_at: new Date().toISOString() })
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .select("id, site_id, key, type, draft_value, published_value, status, updated_at, published_at")
      .maybeSingle();

    if (error) {
      return reply.code(500).send({ error: "Erro ao salvar conteúdo" } satisfies ApiErrorBody);
    }
    if (!updated) {
      return reply.code(404).send({ error: "Bloco não encontrado" } satisfies ApiErrorBody);
    }

    return reply.send(toContentBlock(updated as ContentBlockRow));
  });

  app.post("/v1/ayhub/sites/:id/publish", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const { data: blocks, error } = await ctx.supabase
      .schema("ayhub")
      .from("content_blocks")
      .select("id, draft_value, published_value")
      .eq("organization_id", ctx.orgId)
      .eq("site_id", params.data.id);

    if (error) {
      return reply.code(500).send({ error: "Erro ao publicar" } satisfies ApiErrorBody);
    }

    const changed = ((blocks ?? []) as Array<{ id: string; draft_value: unknown; published_value: unknown }>).filter(
      (block) => JSON.stringify(block.draft_value) !== JSON.stringify(block.published_value),
    );

    const publishedAt = new Date().toISOString();
    await Promise.all(
      changed.map((block) =>
        ctx.supabase
          .schema("ayhub")
          .from("content_blocks")
          .update({
            published_value: block.draft_value,
            status: "published",
            published_at: publishedAt,
            updated_at: publishedAt,
          })
          .eq("organization_id", ctx.orgId)
          .eq("id", block.id),
      ),
    );

    const { data: updatedBlocks } = await ctx.supabase
      .schema("ayhub")
      .from("content_blocks")
      .select("id, site_id, key, type, draft_value, published_value, status, updated_at, published_at")
      .eq("organization_id", ctx.orgId)
      .eq("site_id", params.data.id)
      .order("key", { ascending: true });

    return reply.send({
      publishedCount: changed.length,
      contentBlocks: ((updatedBlocks ?? []) as ContentBlockRow[]).map(toContentBlock),
    } satisfies AyhubPublishSiteResponse);
  });

  app.post("/v1/ayhub/clients/:id/payments", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const body = createAyhubPaymentSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const { data: client } = await ctx.supabase
      .schema("ayhub")
      .from("clients")
      .select("id")
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (!client) {
      return reply.code(404).send({ error: "Cliente não encontrado" } satisfies ApiErrorBody);
    }

    const { data: created, error } = await ctx.supabase
      .schema("ayhub")
      .from("payments")
      .insert({
        organization_id: ctx.orgId,
        client_id: params.data.id,
        amount: body.data.amount,
        date: body.data.date,
      })
      .select("id, client_id, amount, date, created_at")
      .single();

    if (error || !created) {
      return reply.code(500).send({ error: "Erro ao registrar pagamento" } satisfies ApiErrorBody);
    }

    return reply.code(201).send(toPayment(created as PaymentRow));
  });

  app.get("/v1/ayhub/dashboard", async (request, reply) => {
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;
    if (!requireOwnerOrAdmin(ctx, reply)) return;

    const [{ data: clients }, { data: sites }, { data: costs }] = await Promise.all([
      timed(request, "ayhub.clients", () =>
        ctx.supabase
          .schema("ayhub")
          .from("clients")
          .select("id, name, maintenance_value, status, start_date")
          .eq("organization_id", ctx.orgId),
      ),
      timed(request, "ayhub.sites", () =>
        ctx.supabase
          .schema("ayhub")
          .from("sites")
          .select("id, client_id, slug, status")
          .eq("organization_id", ctx.orgId),
      ),
      timed(request, "ayhub.costs", () =>
        ctx.supabase
          .schema("ayhub")
          .from("site_costs")
          .select("id, site_id, type, amount, frequency, next_renewal")
          .eq("organization_id", ctx.orgId),
      ),
    ]);

    const clientRows = (clients ?? []) as Array<{
      id: string;
      name: string;
      maintenance_value: number | string | null;
      status: AyhubClientSummary["status"];
      start_date: string;
    }>;
    const siteRows = (sites ?? []) as Array<{ id: string; client_id: string; slug: string; status: AyhubSiteSummary["status"] }>;
    const costRows = (costs ?? []) as Array<{
      id: string;
      site_id: string;
      type: AyhubSiteCost["type"];
      amount: number | string;
      frequency: AyhubFrequency;
      next_renewal: string | null;
    }>;

    const monthlyCostBySite = new Map<string, number>();
    for (const cost of costRows) {
      const current = monthlyCostBySite.get(cost.site_id) ?? 0;
      monthlyCostBySite.set(cost.site_id, current + monthlyEquivalent(Number(cost.amount), cost.frequency));
    }

    const totalActiveSites = siteRows.filter((site) => site.status !== "paused").length;
    const grossMrr = clientRows.reduce(
      (sum, client) => sum + (client.status === "active" ? Number(client.maintenance_value ?? 0) : 0),
      0,
    );
    const totalRecurringCost = Array.from(monthlyCostBySite.values()).reduce((sum, value) => sum + value, 0);
    const netMrr = grossMrr - totalRecurringCost;

    const nowDate = new Date();
    const todayTime = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());
    const in30Days = todayTime + 30 * 24 * 60 * 60 * 1000;
    const siteById = new Map(siteRows.map((site) => [site.id, site]));
    const clientById = new Map(clientRows.map((client) => [client.id, client]));

    const costRenewalAlerts: AyhubRenewalAlert[] = costRows
      .filter((cost) => cost.next_renewal)
      .flatMap((cost) => {
        const site = siteById.get(cost.site_id);
        const client = site ? clientById.get(site.client_id) : undefined;
        const renewalTime = dateOnlyTime(cost.next_renewal);
        if (renewalTime === null) return [];
        return [{
          type: "site_cost" as const,
          clientId: client?.id ?? "",
          siteId: cost.site_id,
          siteSlug: site?.slug ?? "",
          clientName: client?.name ?? "",
          costType: cost.type,
          amount: Number(cost.amount),
          nextRenewal: cost.next_renewal as string,
          daysRemaining: Math.ceil((renewalTime - todayTime) / (24 * 60 * 60 * 1000)),
          renewalTime,
        }];
      })
      .filter((alert) => alert.renewalTime <= in30Days)
      .map(({ renewalTime: _renewalTime, ...alert }) => alert);

    const maintenanceRenewalAlerts: AyhubRenewalAlert[] = clientRows
      .filter((client) => client.status === "active" && Number(client.maintenance_value ?? 0) > 0)
      .flatMap((client) => {
        const startDate = parseDateOnly(client.start_date);
        if (!startDate) return [];
        const renewalDate = nextMonthlyAnniversary(toIsoDate(startDate), nowDate);
        const renewalTime = dateOnlyTime(toIsoDate(renewalDate));
        if (renewalTime === null || renewalTime > in30Days) return [];
        return [{
          type: "maintenance" as const,
          clientId: client.id,
          siteId: null,
          siteSlug: "",
          clientName: client.name,
          costType: null,
          amount: Number(client.maintenance_value ?? 0),
          nextRenewal: toIsoDate(renewalDate),
          daysRemaining: daysBetweenDates(nowDate, renewalDate),
        }];
      });

    const renewalAlerts = [...maintenanceRenewalAlerts, ...costRenewalAlerts].sort((a, b) =>
      a.nextRenewal.localeCompare(b.nextRenewal),
    );

    const monthlyCostByClient = new Map<string, number>();
    for (const site of siteRows) {
      const current = monthlyCostByClient.get(site.client_id) ?? 0;
      monthlyCostByClient.set(site.client_id, current + (monthlyCostBySite.get(site.id) ?? 0));
    }

    const clientMargins: AyhubClientMargin[] = clientRows.map((client) => {
      const maintenanceValue = client.maintenance_value === null ? null : Number(client.maintenance_value);
      const monthlyCostTotal = monthlyCostByClient.get(client.id) ?? 0;
      const marginPercent =
        maintenanceValue && maintenanceValue > 0
          ? ((maintenanceValue - monthlyCostTotal) / maintenanceValue) * 100
          : null;
      return {
        clientId: client.id,
        clientName: client.name,
        maintenanceValue,
        monthlyCostTotal,
        marginPercent,
      };
    });

    return reply.send({
      totalActiveSites,
      grossMrr,
      netMrr,
      renewalAlerts,
      clientMargins,
    } satisfies AyhubDashboardResponse);
  });
}
