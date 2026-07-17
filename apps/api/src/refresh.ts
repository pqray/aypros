import { refreshConfig } from "@aypros/config";
import { DiscoveryError, type DiscoveredBusiness, type PlaceDetailsProvider } from "@aypros/integrations";
import type { BusinessRefreshResponse } from "@aypros/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyBaseLogger } from "fastify";
import { auditBusiness } from "./audits";

type RefreshCandidateRow = {
  business_id: string;
  organization_id: string;
  user_id: string;
  provider_place_id: string;
  refreshed_at: string | null;
  last_audit_at: string | null;
  needs_places: boolean;
  needs_audit: boolean;
};

type BusinessRow = {
  id: string;
  provider: string;
  provider_place_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website_url: string | null;
  rating: number | string | null;
  review_count: number | null;
  categories: string[] | null;
  lat: number | string | null;
  lng: number | string | null;
  raw: Record<string, unknown> | null;
};

export type RefreshBusinessResult = {
  businessId: string;
  refreshedAt: string | null;
  providerStatus: "active" | "removed" | "error";
  placesRefreshed: boolean;
  auditRefreshed: boolean;
  scoreRecalculated: boolean;
};

export function staleBefore(days: number, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function shouldProcessRefreshCandidate(candidate: {
  needs_places: boolean;
  needs_audit: boolean;
}, placeDetailsUsed: number) {
  const canRefreshPlaces =
    candidate.needs_places && placeDetailsUsed < refreshConfig.maxPlaceDetailsPerDay;
  return {
    canRefreshPlaces,
    shouldProcess: canRefreshPlaces || candidate.needs_audit,
  };
}

export function mergeBusinessRefresh(existing: BusinessRow, details: DiscoveredBusiness, nowIso: string) {
  return {
    name: details.name || existing.name,
    address: details.address ?? existing.address,
    city: details.city ?? existing.city,
    state: details.state ?? existing.state,
    phone: details.phone ?? existing.phone,
    website_url: details.websiteUrl ?? existing.website_url,
    rating: details.rating ?? existing.rating,
    review_count: details.reviewCount ?? existing.review_count,
    categories: details.categories.length > 0 ? details.categories : (existing.categories ?? []),
    lat: details.lat ?? existing.lat,
    lng: details.lng ?? existing.lng,
    raw: {
      ...(existing.raw ?? {}),
      ...details.raw,
      socialOnly: details.socialOnly,
      social_only: details.socialOnly,
      refreshedFrom: "place_details",
    },
    provider_status: "active",
    refreshed_at: nowIso,
    updated_at: nowIso,
  };
}

async function getDailyPlaceDetailsUsed(db: SupabaseClient, now = new Date()) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const { count, error } = await db
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("type", "data_refresh_requested")
    .contains("payload", { placeDetailsCalled: true })
    .gte("created_at", dayStart.toISOString());

  if (error) {
    throw new Error(`refresh cap count failed: ${error.message}`);
  }

  return count ?? 0;
}

async function recordRefreshActivity(params: {
  db: SupabaseClient;
  orgId: string;
  businessId: string;
  userId: string | null;
  manual: boolean;
  placesRefreshed: boolean;
  auditRefreshed: boolean;
  providerStatus: RefreshBusinessResult["providerStatus"];
  placeDetailsCalled: boolean;
}) {
  const { error } = await params.db.from("activities").insert({
    organization_id: params.orgId,
    business_id: params.businessId,
    actor_id: params.userId,
    type: "data_refresh_requested",
    payload: {
      manual: params.manual,
      placesRefreshed: params.placesRefreshed,
      auditRefreshed: params.auditRefreshed,
      providerStatus: params.providerStatus,
      placeDetailsCalled: params.placeDetailsCalled,
    },
  });

  if (error) {
    throw new Error(`refresh activity insert failed: ${error.message}`);
  }
}

export async function listRefreshCandidates(db: SupabaseClient) {
  const { data, error } = await db.rpc("get_refresh_candidates", {
    places_stale_before: staleBefore(refreshConfig.placesFreshnessDays),
    audit_stale_before: staleBefore(refreshConfig.auditFreshnessDays),
    max_rows: refreshConfig.batchSize,
  });

  if (error) {
    throw new Error(`refresh candidate query failed: ${error.message}`);
  }

  return (data ?? []) as RefreshCandidateRow[];
}

async function fetchBusiness(db: SupabaseClient, businessId: string) {
  const { data, error } = await db
    .from("businesses")
    .select(
      "id, provider, provider_place_id, name, address, city, state, phone, website_url, rating, review_count, categories, lat, lng, raw",
    )
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`business fetch failed: ${error.message}`);
  }

  return data as BusinessRow | null;
}

async function refreshPlaces(params: {
  db: SupabaseClient;
  provider: PlaceDetailsProvider;
  business: BusinessRow;
  nowIso: string;
}) {
  try {
    const details = await params.provider.getDetails(params.business.provider_place_id);
    const { error } = await params.db
      .from("businesses")
      .update(mergeBusinessRefresh(params.business, details, params.nowIso))
      .eq("id", params.business.id);

    if (error) {
      throw new Error(`business refresh update failed: ${error.message}`);
    }

    return "active" as const;
  } catch (error) {
    if (error instanceof DiscoveryError && error.code === "NOT_FOUND") {
      const { error: updateError } = await params.db
        .from("businesses")
        .update({ provider_status: "removed", updated_at: params.nowIso })
        .eq("id", params.business.id);

      if (updateError) {
        throw new Error(`business provider_status update failed: ${updateError.message}`);
      }

      return "removed" as const;
    }

    throw error;
  }
}

export async function refreshBusiness(params: {
  db: SupabaseClient;
  provider: PlaceDetailsProvider;
  businessId: string;
  orgId: string;
  userId: string;
  force?: boolean;
}) {
  const business = await fetchBusiness(params.db, params.businessId);
  if (!business) {
    return null;
  }

  const nowIso = new Date().toISOString();
  let placesRefreshed = false;
  let auditRefreshed = false;
  let scoreRecalculated = false;
  let providerStatus: RefreshBusinessResult["providerStatus"] = "active";
  let placeDetailsCalled = false;

  if (params.force) {
    const used = await getDailyPlaceDetailsUsed(params.db);
    if (used >= refreshConfig.maxPlaceDetailsPerDay) {
      const rateError = new Error("REFRESH_DAILY_CAP_REACHED");
      rateError.name = "RateLimitError";
      throw rateError;
    }
  }

  try {
    if (params.force) {
      placeDetailsCalled = true;
      providerStatus = await refreshPlaces({
        db: params.db,
        provider: params.provider,
        business,
        nowIso,
      });
      placesRefreshed = providerStatus === "active";
    }

    const audit = await auditBusiness({
      db: params.db,
      orgId: params.orgId,
      userId: params.userId,
      businessId: params.businessId,
      enforceRateLimit: false,
    });
    auditRefreshed = audit !== null;
    scoreRecalculated = audit !== null;
  } catch (error) {
    if (providerStatus === "removed") {
      await recordRefreshActivity({
        db: params.db,
        orgId: params.orgId,
        businessId: params.businessId,
        userId: params.userId,
        manual: params.force === true,
        placesRefreshed,
        auditRefreshed,
        providerStatus,
        placeDetailsCalled,
      });

      return {
        businessId: params.businessId,
        refreshedAt: null,
        providerStatus,
        placesRefreshed,
        auditRefreshed,
        scoreRecalculated,
      } satisfies RefreshBusinessResult;
    }

    if (placeDetailsCalled) {
      await recordRefreshActivity({
        db: params.db,
        orgId: params.orgId,
        businessId: params.businessId,
        userId: params.userId,
        manual: params.force === true,
        placesRefreshed,
        auditRefreshed,
        providerStatus: "error",
        placeDetailsCalled,
      });
    }
    throw error;
  }

  await recordRefreshActivity({
    db: params.db,
    orgId: params.orgId,
    businessId: params.businessId,
    userId: params.userId,
    manual: params.force === true,
    placesRefreshed,
    auditRefreshed,
    providerStatus,
    placeDetailsCalled,
  });

  return {
    businessId: params.businessId,
    refreshedAt: placesRefreshed ? nowIso : null,
    providerStatus,
    placesRefreshed,
    auditRefreshed,
    scoreRecalculated,
  } satisfies RefreshBusinessResult;
}

export async function runRefreshTick(params: {
  db: SupabaseClient;
  provider: PlaceDetailsProvider;
  log: FastifyBaseLogger;
}) {
  const candidates = await listRefreshCandidates(params.db);
  let placeDetailsUsed = await getDailyPlaceDetailsUsed(params.db);
  let processed = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const { canRefreshPlaces, shouldProcess } = shouldProcessRefreshCandidate(
      candidate,
      placeDetailsUsed,
    );

    if (!shouldProcess) {
      continue;
    }

    let placesRefreshed = false;
    let auditRefreshed = false;
    let providerStatus: RefreshBusinessResult["providerStatus"] = "active";

    try {
      if (canRefreshPlaces) {
        placeDetailsUsed += 1;
        const business = await fetchBusiness(params.db, candidate.business_id);
        if (business) {
          providerStatus = await refreshPlaces({
            db: params.db,
            provider: params.provider,
            business,
            nowIso: new Date().toISOString(),
          });
          placesRefreshed = providerStatus === "active";
        }
      }

      if (candidate.needs_audit || canRefreshPlaces) {
        const audit = await auditBusiness({
          db: params.db,
          orgId: candidate.organization_id,
          userId: candidate.user_id,
          businessId: candidate.business_id,
          enforceRateLimit: false,
        });
        auditRefreshed = audit !== null;
      }

      await recordRefreshActivity({
        db: params.db,
        orgId: candidate.organization_id,
        businessId: candidate.business_id,
        userId: candidate.user_id,
        manual: false,
        placesRefreshed,
        auditRefreshed,
        providerStatus,
        placeDetailsCalled: canRefreshPlaces,
      });

      processed += 1;
    } catch (error) {
      if (canRefreshPlaces) {
        await recordRefreshActivity({
          db: params.db,
          orgId: candidate.organization_id,
          businessId: candidate.business_id,
          userId: candidate.user_id,
          manual: false,
          placesRefreshed,
          auditRefreshed,
          providerStatus: error instanceof DiscoveryError && error.code === "NOT_FOUND" ? "removed" : "error",
          placeDetailsCalled: true,
        }).catch((activityError: unknown) => {
          params.log.warn(
            { err: activityError, businessId: candidate.business_id },
            "refresh activity insert failed",
          );
        });
      }
      failed += 1;
      params.log.warn({ err: error, businessId: candidate.business_id }, "refresh item failed");
    }
  }

  params.log.info(
    {
      candidates: candidates.length,
      processed,
      failed,
      placeDetailsUsed,
      placeDetailsCap: refreshConfig.maxPlaceDetailsPerDay,
    },
    "refresh tick completed",
  );

  return { candidates: candidates.length, processed, failed, placeDetailsUsed };
}

export async function ensureManualRefreshRateLimit(db: SupabaseClient, orgId: string) {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("type", "data_refresh_requested")
    .contains("payload", { manual: true })
    .gte("created_at", windowStart);

  if (error) {
    throw new Error(`manual refresh rate limit check failed: ${error.message}`);
  }

  if ((count ?? 0) >= refreshConfig.maxManualRefreshesPerOrgPerHour) {
    const rateError = new Error("REFRESH_RATE_LIMITED");
    rateError.name = "RateLimitError";
    throw rateError;
  }
}

export function toRefreshResponse(result: RefreshBusinessResult): BusinessRefreshResponse {
  return {
    businessId: result.businessId,
    refreshedAt: result.refreshedAt,
    providerStatus: result.providerStatus,
    placesRefreshed: result.placesRefreshed,
    auditRefreshed: result.auditRefreshed,
    scoreRecalculated: result.scoreRecalculated,
  };
}
