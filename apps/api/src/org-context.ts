import type { ApiErrorBody } from "@aypros/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { loadAppContext } from "./app-context";
import { createSupabaseClient } from "./supabase";
import { timed } from "./timing";

export type OrgRequestContext = {
  supabase: SupabaseClient;
  orgId: string;
  userId: string;
  organizationName: string;
  userName: string | null;
  role: "owner" | "admin" | "member";
};

/** Shared by every route module: session + active-org guard (specs/17 — never trust a client-supplied org id). */
export async function requireOrgContext(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<OrgRequestContext | null> {
  const supabase = createSupabaseClient(request, reply);
  const context = await timed(request, "ctx", () => loadAppContext(supabase));

  if (!context) {
    await reply.code(401).send({ error: "Unauthorized" } satisfies ApiErrorBody);
    return null;
  }
  if (!context.organization) {
    await reply.code(403).send({ error: "Organization required" } satisfies ApiErrorBody);
    return null;
  }

  return {
    supabase,
    orgId: context.organization.id,
    userId: context.user.id,
    organizationName: context.organization.name,
    userName: context.profile.full_name,
    role: context.organization.role,
  };
}
