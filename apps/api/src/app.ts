import cors from "@fastify/cors";
import { refreshConfig } from "@aypros/config";
import { createGooglePlacesProvider, type PlaceDetailsProvider } from "@aypros/integrations";
import Fastify from "fastify";
import { env } from "./env";
import { loadAppContext } from "./app-context";
import { registerAiRoutes, type AiRoutesOptions } from "./ai";
import { registerAuditRoutes, type AuditRoutesOptions } from "./audits";
import { registerBusinessRoutes, type BusinessRoutesOptions } from "./businesses";
import { registerLeadRoutes, type LeadRoutesOptions } from "./leads";
import { runRefreshTick } from "./refresh";
import { registerReportRoutes, type ReportRoutesOptions } from "./reports";
import { registerSearchRoutes, type SearchRoutesOptions } from "./searches";
import { createServiceRoleClient, createSupabaseClient } from "./supabase";

declare module "fastify" {
  interface FastifyRequest {
    startTime?: bigint;
  }
}

function hasPlaceDetailsProvider(
  provider: unknown,
): provider is SearchRoutesOptions["discoveryProvider"] & PlaceDetailsProvider {
  return typeof (provider as { getDetails?: unknown }).getDetails === "function";
}

export function buildApp(
  overrides: Partial<
    SearchRoutesOptions &
      AuditRoutesOptions &
      BusinessRoutesOptions &
      LeadRoutesOptions &
      AiRoutesOptions &
      ReportRoutesOptions
  > = {},
) {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : env.API_LOG_LEVEL,
      redact: ["req.headers.cookie", "res.headers.set-cookie"],
    },
  });

  app.addHook("onRequest", async (request) => {
    request.startTime = process.hrtime.bigint();
  });

  app.addHook("onSend", async (request, reply, payload) => {
    if (request.startTime) {
      const durationMs = Number(process.hrtime.bigint() - request.startTime) / 1_000_000;
      reply.header("server-timing", `app;dur=${durationMs.toFixed(1)}`);
    }

    return payload;
  });

  app.addHook("onResponse", async (request, reply) => {
    if (!request.startTime) return;

    const durationMs = Number(process.hrtime.bigint() - request.startTime) / 1_000_000;

    if (durationMs >= 500) {
      request.log.warn(
        {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          durationMs: Math.round(durationMs),
        },
        "slow api request",
      );
    }
  });

  const localhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

  void app.register(cors, {
    origin(origin, callback) {
      const allowed =
        !origin ||
        env.WEB_ORIGINS.includes(origin) ||
        (process.env.NODE_ENV !== "production" && localhostOrigin.test(origin));

      // callback(null, false) responde sem headers CORS em vez de derrubar a request com 500
      callback(null, allowed);
    },
    credentials: true,
  });

  app.get("/health", { logLevel: "silent" }, async () => ({ ok: true }));

  app.get("/v1/app-context", async (request, reply) => {
    try {
      const supabase = createSupabaseClient(request, reply);
      const context = await loadAppContext(supabase);

      if (!context) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      return reply
        .header("cache-control", "private, max-age=30, stale-while-revalidate=120")
        .send(context);
    } catch (error) {
      const authError = error as { code?: string; status?: number };

      if (authError.status === 429 || authError.code === "over_request_rate_limit") {
        return reply
          .code(429)
          .header("retry-after", "60")
          .send({ error: "Auth rate limit reached" });
      }

      throw error;
    }
  });

  const discoveryProvider =
    overrides.discoveryProvider ?? createGooglePlacesProvider({ apiKey: env.GOOGLE_PLACES_API_KEY });
  const serviceDb = overrides.serviceDb;

  registerSearchRoutes(app, { discoveryProvider, serviceDb });
  registerAuditRoutes(app, { serviceDb: overrides.serviceDb });
  registerBusinessRoutes(app, {
    serviceDb: overrides.serviceDb,
    detailsProvider: hasPlaceDetailsProvider(discoveryProvider) ? discoveryProvider : undefined,
  });
  registerLeadRoutes(app, { serviceDb: overrides.serviceDb });
  registerAiRoutes(app, { serviceDb: overrides.serviceDb, aiProvider: overrides.aiProvider });
  registerReportRoutes(app, { serviceDb: overrides.serviceDb });

  if (process.env.NODE_ENV !== "test" && env.REFRESH_ENABLED) {
    let timer: NodeJS.Timeout | undefined;
    let running = false;
    const refreshDb = serviceDb ?? createServiceRoleClient();

    app.addHook("onReady", async () => {
      const tick = () => {
        if (!hasPlaceDetailsProvider(discoveryProvider)) return;
        if (running) return;
        running = true;
        void runRefreshTick({ db: refreshDb, provider: discoveryProvider, log: app.log })
          .catch((error: unknown) => {
            app.log.error({ err: error }, "refresh tick failed");
          })
          .finally(() => {
            running = false;
          });
      };
      timer = setInterval(tick, refreshConfig.schedulerIntervalMs);
      timer.unref();
      tick();
    });

    app.addHook("onClose", (_instance, done) => {
      if (timer) clearInterval(timer);
      done();
    });
  }

  return app;
}
