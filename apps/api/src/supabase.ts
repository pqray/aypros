import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyReply, FastifyRequest } from "fastify";
import { parseCookie, stringifySetCookie } from "cookie";
import { env } from "./env";

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: boolean | "lax" | "strict" | "none";
    secure?: boolean;
  };
};

function getRequestCookies(request: FastifyRequest) {
  const parsed = parseCookie(request.headers.cookie ?? "");

  return Object.entries(parsed)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, value]) => ({ name, value }));
}

function appendSetCookie(reply: FastifyReply, cookiesToSet: CookieToSet[]) {
  const existing = reply.getHeader("set-cookie");
  const previous = Array.isArray(existing)
    ? existing.map(String)
    : typeof existing === "string"
      ? [existing]
      : [];

  const next = cookiesToSet.map(({ name, value, options }) =>
    stringifySetCookie({
      name,
      value,
      ...options,
      sameSite: options?.sameSite === true ? "strict" : options?.sameSite,
    }),
  );

  reply.header("set-cookie", [...previous, ...next]);
}

export function createSupabaseClient(
  request: FastifyRequest,
  reply: FastifyReply,
): SupabaseClient {
  const client = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return getRequestCookies(request);
      },
      setAll(cookiesToSet) {
        appendSetCookie(reply, cookiesToSet as CookieToSet[]);
      },
    },
  });

  return client as unknown as SupabaseClient;
}
