import type { ApiErrorBody } from "@aypros/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import { hashSiteKey } from "./ayhub-service";
import { createServiceRoleClient } from "./supabase";
import { timed } from "./timing";

export type ContentRoutesOptions = {
  serviceDb?: SupabaseClient;
};

/**
 * API pública consumida pelos sites de cliente (Next.js separados, Vercel)
 * via SSR — autenticada por SITE_KEY, nunca por sessão/cookie (specs/21-ayhub.md).
 */
export function registerContentRoutes(app: FastifyInstance, options: ContentRoutesOptions = {}) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();

  app.get("/v1/content", async (request, reply) => {
    const auth = request.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : null;

    if (!token) {
      return reply.code(401).send({ error: "SITE_KEY ausente" } satisfies ApiErrorBody);
    }

    const { data: keyRow, error: keyError } = await timed(request, "content.key", () =>
      serviceDb
        .schema("ayhub")
        .from("site_keys")
        .select("id, site_id")
        .eq("key_hash", hashSiteKey(token))
        .is("revoked_at", null)
        .maybeSingle(),
    );

    if (keyError) {
      return reply.code(500).send({ error: "Erro ao validar SITE_KEY" } satisfies ApiErrorBody);
    }
    if (!keyRow) {
      return reply.code(401).send({ error: "SITE_KEY inválida ou revogada" } satisfies ApiErrorBody);
    }

    const key = keyRow as { id: string; site_id: string };

    const { data: blocks, error: blocksError } = await timed(request, "content.blocks", () =>
      serviceDb
        .schema("ayhub")
        .from("content_blocks")
        .select("key, published_value")
        .eq("site_id", key.site_id),
    );

    void serviceDb
      .schema("ayhub")
      .from("site_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", key.id)
      .then(({ error }) => {
        if (error) request.log.warn({ err: error, siteKeyId: key.id }, "site key last_used_at update failed");
      });

    if (blocksError) {
      return reply.code(500).send({ error: "Erro ao carregar conteúdo" } satisfies ApiErrorBody);
    }

    const result: Record<string, unknown> = {};
    for (const block of (blocks ?? []) as Array<{ key: string; published_value: unknown }>) {
      result[block.key] = block.published_value;
    }

    return reply.header("cache-control", "private, max-age=10").send({ blocks: result });
  });
}
