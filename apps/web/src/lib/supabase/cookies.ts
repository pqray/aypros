type CookieReader = {
  getAll(): Array<{ name: string }>;
};

export function hasSupabaseAuthCookie(cookieStore: CookieReader) {
  return cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}
