import cors from "@fastify/cors";
import { createGooglePlacesProvider } from "@aypros/integrations";
import Fastify from "fastify";
import { env } from "./env";
import { loadAppContext } from "./app-context";
import { registerAiRoutes, type AiRoutesOptions } from "./ai";
import { registerAuditRoutes, type AuditRoutesOptions } from "./audits";
import { registerBusinessRoutes, type BusinessRoutesOptions } from "./businesses";
import { registerLeadRoutes, type LeadRoutesOptions } from "./leads";
import { registerSearchRoutes, type SearchRoutesOptions } from "./searches";
import { createSupabaseClient } from "./supabase";

export function buildApp(
  overrides: Partial<
    SearchRoutesOptions & AuditRoutesOptions & BusinessRoutesOptions & LeadRoutesOptions & AiRoutesOptions
  > = {},
) {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : env.API_LOG_LEVEL,
      redact: ["req.headers.cookie", "res.headers.set-cookie"],
    },
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

  registerSearchRoutes(app, {
    discoveryProvider:
      overrides.discoveryProvider ??
      createGooglePlacesProvider({ apiKey: env.GOOGLE_PLACES_API_KEY }),
    serviceDb: overrides.serviceDb,
  });
  registerAuditRoutes(app, { serviceDb: overrides.serviceDb });
  registerBusinessRoutes(app, { serviceDb: overrides.serviceDb });
  registerLeadRoutes(app, { serviceDb: overrides.serviceDb });
  registerAiRoutes(app, { serviceDb: overrides.serviceDb, aiProvider: overrides.aiProvider });

  return app;
}
