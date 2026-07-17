import { discoveryConfig } from "@aypros/config";
import {
  DiscoveryError,
  type DiscoveredBusiness,
  type DiscoveryProvider,
} from "@aypros/integrations";
import type {
  ApiErrorBody,
  CreateSearchResponse,
  SearchListResponse,
  SearchResultItem,
  SearchResultsResponse,
  SearchStatus,
  SearchSummary,
} from "@aypros/types";
import { createSearchSchema } from "@aypros/validation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { z } from "zod";
import { auditSearchResults } from "./audits";
import { requireOrgContext } from "./org-context";
import { createServiceRoleClient } from "./supabase";

const SEARCH_FIELDS =
  "id, city, state, segment, status, total_found, error_message, provider, created_at";

const searchRowSchema = z.object({
  id: z.string(),
  city: z.string(),
  state: z.string(),
  segment: z.string(),
  status: z.enum(["pending", "processing", "completed", "partial", "failed"]),
  total_found: z.coerce.number().int(),
  error_message: z.string().nullable(),
  provider: z.string(),
  created_at: z.string(),
});

function toSearchSummary(row: unknown): SearchSummary {
  const parsed = searchRowSchema.parse(row);
  return {
    id: parsed.id,
    city: parsed.city,
    state: parsed.state,
    segment: parsed.segment,
    status: parsed.status,
    totalFound: parsed.total_found,
    errorMessage: parsed.error_message,
    provider: parsed.provider,
    createdAt: parsed.created_at,
  };
}

const TERMINAL_STATUSES: SearchStatus[] = ["completed", "partial", "failed"];

export function friendlyDiscoveryMessage(error: unknown): string {
  if (error instanceof DiscoveryError) {
    switch (error.code) {
      case "RATE_LIMITED":
        return "O provedor de dados limitou as requisições. Tente novamente em alguns minutos.";
      case "QUOTA_EXCEEDED":
        return "A cota do provedor de dados foi atingida. Tente novamente mais tarde.";
      case "INVALID_LOCATION":
        return "Não encontramos essa localização. Verifique a cidade e a UF.";
      default:
        return "Falha ao consultar o provedor de dados. Tente novamente.";
    }
  }
  return "Erro inesperado ao processar a pesquisa. Tente novamente.";
}

function toBusinessRow(business: DiscoveredBusiness, nowIso: string) {
  return {
    provider: business.provider,
    provider_place_id: business.providerPlaceId,
    name: business.name,
    address: business.address,
    city: business.city,
    state: business.state,
    phone: business.phone,
    website_url: business.websiteUrl,
    rating: business.rating,
    review_count: business.reviewCount,
    categories: business.categories,
    lat: business.lat,
    lng: business.lng,
    raw: business.raw,
    updated_at: nowIso,
  };
}

export type ExecuteSearchDeps = {
  db: SupabaseClient;
  provider: DiscoveryProvider;
  searchId: string;
  log: FastifyBaseLogger;
};

/**
 * Runs the discovery flow for one search: pending → processing → terminal.
 * Idempotent and resumable — already-linked businesses are skipped, so a
 * retry after a partial failure only appends what is missing.
 */
export async function executeSearch({
  db,
  provider,
  searchId,
  log,
}: ExecuteSearchDeps): Promise<void> {
  const { data: searchRow } = await db
    .from("searches")
    .select("*")
    .eq("id", searchId)
    .maybeSingle();
  if (!searchRow) {
    return;
  }

  const search = searchRow as {
    organization_id: string;
    created_by: string;
    city: string;
    state: string;
    country: string;
    segment: string;
    status: SearchStatus;
  };

  if (TERMINAL_STATUSES.includes(search.status)) {
    return;
  }

  await db
    .from("searches")
    .update({ status: "processing", error_message: null, updated_at: new Date().toISOString() })
    .eq("id", searchId);

  const { data: existingLinks } = await db
    .from("search_results")
    .select("business_id")
    .eq("search_id", searchId);

  const linked = new Set(
    (existingLinks ?? []).map((row) => (row as { business_id: string }).business_id),
  );
  let collected = linked.size;
  let pageToken: string | undefined;

  try {
    while (collected < discoveryConfig.maxResultsPerSearch) {
      const page = await provider.search({
        city: search.city,
        state: search.state || undefined,
        country: search.country,
        segment: search.segment,
        pageToken,
        limit: Math.min(discoveryConfig.pageSize, discoveryConfig.maxResultsPerSearch - collected),
      });

      if (page.businesses.length > 0) {
        const nowIso = new Date().toISOString();
        const { data: upserted, error: upsertError } = await db
          .from("businesses")
          .upsert(
            page.businesses.map((business) => toBusinessRow(business, nowIso)),
            { onConflict: "provider,provider_place_id" },
          )
          .select("id");

        if (upsertError) {
          throw new Error(`businesses upsert failed: ${upsertError.message}`);
        }

        const links: Array<{ search_id: string; business_id: string; position: number }> = [];
        for (const row of (upserted ?? []) as Array<{ id: string }>) {
          if (!linked.has(row.id)) {
            linked.add(row.id);
            collected += 1;
            links.push({ search_id: searchId, business_id: row.id, position: collected });
          }
        }

        if (links.length > 0) {
          const { error: linkError } = await db
            .from("search_results")
            .upsert(links, { onConflict: "search_id,business_id", ignoreDuplicates: true });

          if (linkError) {
            throw new Error(`search_results insert failed: ${linkError.message}`);
          }
        }

        await db
          .from("searches")
          .update({ total_found: collected, updated_at: new Date().toISOString() })
          .eq("id", searchId);
      }

      if (!page.nextPageToken || page.businesses.length === 0) {
        break;
      }
      pageToken = page.nextPageToken;
    }

    await db
      .from("searches")
      .update({ status: "completed", total_found: collected, updated_at: new Date().toISOString() })
      .eq("id", searchId);

    void auditSearchResults({
      db,
      orgId: search.organization_id,
      userId: search.created_by,
      searchId,
    }).catch((error: unknown) => {
      log.error({ err: error, searchId }, "post-search audit batch failed");
    });
  } catch (error) {
    log.error({ err: error, searchId }, "search execution failed");
    await db
      .from("searches")
      .update({
        status: collected > 0 ? "partial" : "failed",
        total_found: collected,
        error_message: friendlyDiscoveryMessage(error),
        updated_at: new Date().toISOString(),
      })
      .eq("id", searchId);
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

const resultsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(30).default(20),
  filter: z.enum(["all", "with_site", "without_site"]).default("all"),
  sort: z.enum(["relevance", "name", "rating", "reviews"]).default("relevance"),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const searchResultRowSchema = z.object({
  business_id: z.string(),
  position: z.coerce.number().int(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  phone: z.string().nullable(),
  website_url: z.string().nullable(),
  rating: z.coerce.number().nullable(),
  review_count: z.coerce.number().int().nullable(),
  categories: z.array(z.string()).default([]),
  favorited: z.boolean(),
  total_count: z.coerce.number().int(),
});

function toSearchResultItem(row: z.infer<typeof searchResultRowSchema>): SearchResultItem {
  return {
    businessId: row.business_id,
    position: row.position,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    phone: row.phone,
    websiteUrl: row.website_url,
    rating: row.rating,
    reviewCount: row.review_count,
    categories: row.categories,
    favorited: row.favorited,
  };
}

export type SearchRoutesOptions = {
  discoveryProvider: DiscoveryProvider;
  /** Injectable for tests; defaults to the real service-role client. */
  serviceDb?: SupabaseClient;
};

export function registerSearchRoutes(app: FastifyInstance, options: SearchRoutesOptions) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();
  const provider = options.discoveryProvider;

  app.post("/v1/searches", async (request, reply) => {
    const parsed = createSearchSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "Dados inválidos", code: "VALIDATION" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { city, state, segment } = parsed.data;

    // Rate limit: N searches per org per hour (DB counter, specs/17).
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countError } = await ctx.supabase
      .from("searches")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.orgId)
      .gte("created_at", windowStart);

    if (countError) {
      return reply.code(500).send({ error: "Erro ao verificar limite" } satisfies ApiErrorBody);
    }

    if ((recentCount ?? 0) >= discoveryConfig.maxSearchesPerOrgPerHour) {
      const { data: oldest } = await ctx.supabase
        .from("searches")
        .select("created_at")
        .eq("organization_id", ctx.orgId)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const oldestAt = oldest
        ? new Date((oldest as { created_at: string }).created_at).getTime()
        : Date.now();
      const retryAfterSeconds = Math.max(
        60,
        Math.ceil((oldestAt + 60 * 60 * 1000 - Date.now()) / 1000),
      );

      return reply
        .code(429)
        .header("retry-after", String(retryAfterSeconds))
        .send({
          error: "Limite de pesquisas por hora atingido. Aguarde para pesquisar novamente.",
          code: "RATE_LIMITED",
          retryAfterSeconds,
        } satisfies ApiErrorBody);
    }

    // Identical recent search (<24h) is reused instead of hitting the provider again.
    const reuseStart = new Date(
      Date.now() - discoveryConfig.reuseWindowHours * 60 * 60 * 1000,
    ).toISOString();

    let reuseQuery = ctx.supabase
      .from("searches")
      .select(SEARCH_FIELDS)
      .eq("organization_id", ctx.orgId)
      .eq("status", "completed")
      .ilike("city", escapeLikePattern(city))
      .ilike("segment", escapeLikePattern(segment))
      .gte("created_at", reuseStart)
      .order("created_at", { ascending: false })
      .limit(1);
    if (state) {
      reuseQuery = reuseQuery.eq("state", state);
    }

    const { data: reusable } = await reuseQuery.maybeSingle();
    if (reusable) {
      return reply
        .code(200)
        .send({ search: toSearchSummary(reusable), reused: true } satisfies CreateSearchResponse);
    }

    const { data: created, error: insertError } = await ctx.supabase
      .from("searches")
      .insert({
        organization_id: ctx.orgId,
        created_by: ctx.userId,
        city,
        state: state ?? "",
        country: "BR",
        segment,
        status: "pending",
        provider: provider.name,
      })
      .select(SEARCH_FIELDS)
      .single();

    if (insertError || !created) {
      return reply.code(500).send({ error: "Erro ao criar pesquisa" } satisfies ApiErrorBody);
    }

    const search = toSearchSummary(created);

    const { error: activityError } = await serviceDb.from("activities").insert({
      organization_id: ctx.orgId,
      actor_id: ctx.userId,
      type: "search_created",
      payload: { search_id: search.id, city, state: state ?? null, segment },
    });
    if (activityError) {
      request.log.warn({ err: activityError }, "failed to record search_created activity");
    }

    void executeSearch({ db: serviceDb, provider, searchId: search.id, log: request.log }).catch(
      (error: unknown) => {
        request.log.error({ err: error, searchId: search.id }, "detached search execution crashed");
      },
    );

    return reply.code(201).send({ search, reused: false } satisfies CreateSearchResponse);
  });

  app.get("/v1/searches", async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query ?? {});
    if (!query.success) {
      return reply.code(400).send({ error: "Parâmetros inválidos" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { page, pageSize } = query.data;
    const from = (page - 1) * pageSize;

    const { data, count, error } = await serviceDb
      .from("searches")
      .select(SEARCH_FIELDS, { count: "exact" })
      .eq("organization_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      return reply.code(500).send({ error: "Erro ao listar pesquisas" } satisfies ApiErrorBody);
    }

    return reply.send({
      items: (data ?? []).map(toSearchSummary),
      page,
      pageSize,
      total: count ?? 0,
    } satisfies SearchListResponse);
  });

  app.get("/v1/searches/:id", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data, error } = await serviceDb
      .from("searches")
      .select(SEARCH_FIELDS)
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (error) {
      return reply.code(500).send({ error: "Erro ao carregar pesquisa" } satisfies ApiErrorBody);
    }
    if (!data) {
      return reply.code(404).send({ error: "Pesquisa não encontrada" } satisfies ApiErrorBody);
    }

    return reply.send({ search: toSearchSummary(data) });
  });

  app.get("/v1/searches/:id/results", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }
    const query = resultsQuerySchema.safeParse(request.query ?? {});
    if (!query.success) {
      return reply.code(400).send({ error: "Parâmetros inválidos" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data: search } = await serviceDb
      .from("searches")
      .select("id")
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (!search) {
      return reply.code(404).send({ error: "Pesquisa não encontrada" } satisfies ApiErrorBody);
    }

    const { page, pageSize, filter, sort } = query.data;
    const { data, error } = await serviceDb.rpc("get_search_results_page_api", {
      target_search_id: params.data.id,
      org_id: ctx.orgId,
      website_filter: filter,
      sort_by: sort,
      page,
      page_size: pageSize,
    });

    if (error) {
      return reply.code(500).send({ error: "Erro ao carregar resultados" } satisfies ApiErrorBody);
    }

    const rows = z.array(searchResultRowSchema).parse(data ?? []);

    return reply.send({
      items: rows.map(toSearchResultItem),
      page,
      pageSize,
      total: rows[0]?.total_count ?? 0,
    } satisfies SearchResultsResponse);
  });

  app.post("/v1/searches/:id/retry", async (request, reply) => {
    const params = idParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id inválido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    const { data: existing } = await serviceDb
      .from("searches")
      .select(SEARCH_FIELDS)
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .maybeSingle();

    if (!existing) {
      return reply.code(404).send({ error: "Pesquisa não encontrada" } satisfies ApiErrorBody);
    }

    const summary = toSearchSummary(existing);
    if (summary.status === "processing" || summary.status === "completed") {
      return reply
        .code(409)
        .send({ error: "Esta pesquisa não pode ser reexecutada agora" } satisfies ApiErrorBody);
    }

    const { data: updated, error: updateError } = await serviceDb
      .from("searches")
      .update({ status: "pending", error_message: null, updated_at: new Date().toISOString() })
      .eq("organization_id", ctx.orgId)
      .eq("id", params.data.id)
      .select(SEARCH_FIELDS)
      .single();

    if (updateError || !updated) {
      return reply.code(500).send({ error: "Erro ao reexecutar pesquisa" } satisfies ApiErrorBody);
    }

    void executeSearch({ db: serviceDb, provider, searchId: summary.id, log: request.log }).catch(
      (error: unknown) => {
        request.log.error({ err: error, searchId: summary.id }, "detached search retry crashed");
      },
    );

    return reply.code(202).send({ search: toSearchSummary(updated) });
  });
}
