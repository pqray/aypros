import { businessesConfig } from "@aypros/config";
import type {
  ApiErrorBody,
  BatchActionResult,
  BatchAuditResponse,
  BatchFavoriteResponse,
  BusinessListItem,
  BusinessListResponse,
  FavoriteToggleResponse,
  SavedFilter,
  SavedFilterListResponse,
} from "@aypros/types";
import type { PlaceDetailsProvider } from "@aypros/integrations";
import { businessIdsSchema, businessListQuerySchema, savedFilterCreateSchema } from "@aypros/validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { auditBusiness, canAccessBusiness } from "./audits";
import { buildCsv } from "./csv";
import { requireOrgContext } from "./org-context";
import { ensureManualRefreshRateLimit, refreshBusiness, toRefreshResponse } from "./refresh";
import { createServiceRoleClient } from "./supabase";

const businessListRowSchema = z.object({
  business_id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  phone: z.string().nullable(),
  website_url: z.string().nullable(),
  social_only: z.boolean(),
  instagram_detected: z.boolean().default(false),
  social_links: z.boolean().default(false),
  segment: z.enum(["restaurant", "food_service", "services", "retail", "other"]).default("other"),
  link_in_bio: z.boolean().default(false),
  delivery_platform: z.boolean().default(false),
  menu_online: z.boolean().default(false),
  rating: z.coerce.number().nullable(),
  review_count: z.coerce.number().int().nullable(),
  categories: z.array(z.string()).default([]),
  score: z.coerce.number().int().nullable(),
  score_level: z.enum(["low", "medium", "high", "very_high"]).nullable(),
  audited: z.boolean(),
  site_down: z.boolean(),
  favorited: z.boolean(),
  lead_id: z.string().nullable(),
  total_count: z.coerce.number().int(),
});

function toBusinessListItem(row: z.infer<typeof businessListRowSchema>): BusinessListItem {
  return {
    businessId: row.business_id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    phone: row.phone,
    websiteUrl: row.website_url,
    socialOnly: row.social_only,
    instagramDetected: row.instagram_detected,
    socialLinks: row.social_links,
    segment: row.segment,
    linkInBio: row.link_in_bio,
    deliveryPlatform: row.delivery_platform,
    menuOnline: row.menu_online,
    rating: row.rating,
    reviewCount: row.review_count,
    categories: row.categories,
    score: row.score,
    scoreLevel: row.score_level,
    audited: row.audited,
    siteDown: row.site_down,
    favorited: row.favorited,
    leadId: row.lead_id,
  };
}

type ListParams = {
  page: number;
  pageSize: number;
  websiteFilter: "all" | "with_site" | "without_site";
  segment: "all" | "restaurant" | "food_service" | "services" | "retail" | "other";
  city?: string;
  minScore?: number;
  maxScore?: number;
  minRating?: number;
  audited?: boolean;
  inPipeline?: boolean;
  favoritesOnly?: boolean;
  search?: string;
  sortBy: "name" | "score" | "rating";
  sortDir: "asc" | "desc";
  businessIds?: string[];
};

async function fetchBusinessList(supabase: SupabaseClient, orgId: string, params: ListParams) {
  const { data, error } = await supabase.rpc("get_org_businesses_api", {
    org_id: orgId,
    website_filter: params.websiteFilter,
    segment_filter: params.segment,
    city_filter: params.city,
    min_score: params.minScore,
    max_score: params.maxScore,
    min_rating: params.minRating,
    audited_filter: params.audited,
    in_pipeline_filter: params.inPipeline,
    only_favorites: params.favoritesOnly ?? false,
    business_ids: params.businessIds,
    search_term: params.search,
    sort_by: params.sortBy,
    sort_dir: params.sortDir,
    page: params.page,
    page_size: params.pageSize,
  });

  if (error) {
    throw new Error(`business list query failed: ${error.message}`);
  }

  const rows = z.array(businessListRowSchema).parse(data ?? []);
  return {
    items: rows.map(toBusinessListItem),
    total: rows[0]?.total_count ?? 0,
  };
}

async function ensureExportRateLimit(db: SupabaseClient, orgId: string) {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("type", "export_created")
    .gte("created_at", windowStart);

  if (error) {
    throw new Error(`export rate limit check failed: ${error.message}`);
  }
  return (count ?? 0) < businessesConfig.maxExportsPerOrgPerHour;
}

const exportQuerySchema = businessListQuerySchema
  .omit({ page: true, pageSize: true })
  .extend({
    businessIds: z
      .string()
      .optional()
      .transform((value) => (value ? value.split(",").filter(Boolean) : undefined)),
  });

const savedFilterRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  filters: z.record(z.string(), z.unknown()),
  created_at: z.string(),
});

function toSavedFilter(row: unknown): SavedFilter {
  const parsed = savedFilterRowSchema.parse(row);
  return { id: parsed.id, name: parsed.name, filters: parsed.filters, createdAt: parsed.created_at };
}

export type BusinessRoutesOptions = {
  serviceDb?: SupabaseClient;
  detailsProvider?: PlaceDetailsProvider;
};

export function registerBusinessRoutes(app: FastifyInstance, options: BusinessRoutesOptions = {}) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();
  const detailsProvider = options.detailsProvider;

  app.get("/v1/businesses", async (request, reply) => {
    const query = businessListQuerySchema.safeParse(request.query ?? {});
    if (!query.success) {
      return reply.code(400).send({ error: "Parâmetros inválidos" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      const { items, total } = await fetchBusinessList(serviceDb, ctx.orgId, query.data);
      return reply.send({
        items,
        page: query.data.page,
        pageSize: query.data.pageSize,
        total,
      } satisfies BusinessListResponse);
    } catch (error) {
      request.log.error({ err: error }, "business list failed");
      return reply.code(500).send({ error: "Erro ao listar empresas" } satisfies ApiErrorBody);
    }
  });

  app.get("/v1/businesses/export.csv", async (request, reply) => {
    const query = exportQuerySchema.safeParse(request.query ?? {});
    if (!query.success) {
      return reply.code(400).send({ error: "Parâmetros inválidos" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      if (!(await ensureExportRateLimit(serviceDb, ctx.orgId))) {
        return reply.code(429).send({
          error: "Limite de exportações por hora atingido",
          code: "RATE_LIMITED",
        } satisfies ApiErrorBody);
      }

      const { items } = await fetchBusinessList(serviceDb, ctx.orgId, {
        ...query.data,
        page: 1,
        pageSize: businessesConfig.maxExportRows,
      });

      const rows: string[][] = [
        ["Nome", "Cidade", "UF", "Telefone", "Site", "Avaliação", "Score", "Nível"],
        ...items.map((item) => [
          item.name,
          item.city ?? "",
          item.state ?? "",
          item.phone ?? "",
          item.websiteUrl ?? "Sem site",
          item.rating !== null ? String(item.rating) : "",
          item.score !== null ? String(item.score) : "",
          item.scoreLevel ?? "",
        ]),
      ];

      await serviceDb.from("activities").insert({
        organization_id: ctx.orgId,
        actor_id: ctx.userId,
        type: "export_created",
        payload: { rows: items.length },
      });

      return reply
        .header("content-type", "text/csv; charset=utf-8")
        .header("content-disposition", 'attachment; filename="empresas.csv"')
        .send(buildCsv(rows));
    } catch (error) {
      request.log.error({ err: error }, "business export failed");
      return reply.code(500).send({ error: "Erro ao exportar empresas" } satisfies ApiErrorBody);
    }
  });

  app.post("/v1/businesses/:businessId/favorite", async (request, reply) => {
    const params = z.object({ businessId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { error } = await serviceDb.from("favorites").upsert(
      {
        organization_id: ctx.orgId,
        business_id: params.data.businessId,
        created_by: ctx.userId,
      },
      { onConflict: "organization_id,business_id", ignoreDuplicates: true },
    );

    if (error) {
      return reply.code(500).send({ error: "Erro ao favoritar" } satisfies ApiErrorBody);
    }

    await serviceDb.from("activities").insert({
      organization_id: ctx.orgId,
      business_id: params.data.businessId,
      actor_id: ctx.userId,
      type: "business_favorited",
      payload: { favorited: true },
    });

    return reply.send({
      businessId: params.data.businessId,
      favorited: true,
    } satisfies FavoriteToggleResponse);
  });

  app.delete("/v1/businesses/:businessId/favorite", async (request, reply) => {
    const params = z.object({ businessId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { error } = await serviceDb
      .from("favorites")
      .delete()
      .eq("organization_id", ctx.orgId)
      .eq("business_id", params.data.businessId);

    if (error) {
      return reply.code(500).send({ error: "Erro ao desfavoritar" } satisfies ApiErrorBody);
    }

    return reply.send({
      businessId: params.data.businessId,
      favorited: false,
    } satisfies FavoriteToggleResponse);
  });

  app.post("/v1/businesses/:businessId/refresh", async (request, reply) => {
    const params = z.object({ businessId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      if (!detailsProvider) {
        return reply.code(503).send({ error: "Refresh indisponível" } satisfies ApiErrorBody);
      }

      if (!(await canAccessBusiness(serviceDb, ctx.orgId, params.data.businessId))) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }

      await ensureManualRefreshRateLimit(serviceDb, ctx.orgId);
      const result = await refreshBusiness({
        db: serviceDb,
        provider: detailsProvider,
        businessId: params.data.businessId,
        orgId: ctx.orgId,
        userId: ctx.userId,
        force: true,
      });

      if (!result) {
        return reply.code(404).send({ error: "Empresa não encontrada" } satisfies ApiErrorBody);
      }

      return reply.code(202).send(toRefreshResponse(result));
    } catch (error) {
      if (error instanceof Error && error.name === "RateLimitError") {
        return reply.code(429).send({
          error: "Limite de atualizacoes atingido",
          code: "RATE_LIMITED",
        } satisfies ApiErrorBody);
      }

      request.log.error({ err: error }, "business refresh failed");
      return reply.code(500).send({ error: "Erro ao atualizar dados" } satisfies ApiErrorBody);
    }
  });

  app.get("/v1/saved-filters", async (request, reply) => {
    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data, error } = await serviceDb
      .from("saved_filters")
      .select("id, name, filters, created_at")
      .eq("organization_id", ctx.orgId)
      .order("created_at", { ascending: false });

    if (error) {
      return reply.code(500).send({ error: "Erro ao listar filtros salvos" } satisfies ApiErrorBody);
    }

    return reply.send({
      items: (data ?? []).map(toSavedFilter),
    } satisfies SavedFilterListResponse);
  });

  app.post("/v1/saved-filters", async (request, reply) => {
    const body = savedFilterCreateSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Dados inválidos" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data, error } = await serviceDb
      .from("saved_filters")
      .insert({
        organization_id: ctx.orgId,
        created_by: ctx.userId,
        name: body.data.name,
        filters: body.data.filters,
      })
      .select("id, name, filters, created_at")
      .single();

    if (error || !data) {
      return reply.code(500).send({ error: "Erro ao salvar filtro" } satisfies ApiErrorBody);
    }

    return reply.code(201).send(toSavedFilter(data));
  });

  app.delete("/v1/saved-filters/:id", async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { error } = await serviceDb
      .from("saved_filters")
      .delete()
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id);

    if (error) {
      return reply.code(500).send({ error: "Erro ao remover filtro" } satisfies ApiErrorBody);
    }

    return reply.code(204).send();
  });

  app.post("/v1/businesses/batch/favorite", async (request, reply) => {
    const body = businessIdsSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Seleção inválida" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const rows = body.data.businessIds.map((businessId) => ({
      organization_id: ctx.orgId,
      business_id: businessId,
      created_by: ctx.userId,
    }));

    const { error } = await serviceDb
      .from("favorites")
      .upsert(rows, { onConflict: "organization_id,business_id", ignoreDuplicates: true });

    const results: BatchActionResult[] = body.data.businessIds.map((businessId) => ({
      businessId,
      ok: !error,
      error: error?.message,
    }));

    return reply.send({ results } satisfies BatchFavoriteResponse);
  });

  app.post("/v1/businesses/batch/audit", async (request, reply) => {
    const body = businessIdsSchema.safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Seleção inválida" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const results: BatchActionResult[] = [];
    for (const businessId of body.data.businessIds) {
      try {
        const outcome = await auditBusiness({
          db: serviceDb,
          orgId: ctx.orgId,
          userId: ctx.userId,
          businessId,
          enforceRateLimit: false,
        });
        results.push({ businessId, ok: outcome !== null, error: outcome ? undefined : "not_found" });
      } catch (error) {
        results.push({
          businessId,
          ok: false,
          error: error instanceof Error ? error.message : "audit_failed",
        });
      }
    }

    return reply.send({ results } satisfies BatchAuditResponse);
  });
}
