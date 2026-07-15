import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { hasSupabaseAuthCookie } from "./cookies";
import { getSupabaseBrowserEnv } from "./env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseBrowserEnv();
  const hasAuthCookie = hasSupabaseAuthCookie(request.cookies);

  if (!hasAuthCookie) {
    return response;
  }

  createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return response;
}
