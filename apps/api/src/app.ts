import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./env";
import { loadAppContext } from "./app-context";
import { createSupabaseClient } from "./supabase";

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : env.API_LOG_LEVEL,
      redact: ["req.headers.cookie", "res.headers.set-cookie"],
    },
  });

  void app.register(cors, {
    origin(origin, callback) {
      if (!origin || env.WEB_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed"), false);
    },
    credentials: true,
  });

  app.get("/health", async () => ({ ok: true }));

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

  return app;
}
