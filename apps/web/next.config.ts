import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aypros/config",
    "@aypros/database",
    "@aypros/integrations",
    "@aypros/scoring",
    "@aypros/types",
    "@aypros/ui",
    "@aypros/validation",
  ],
  // Proxy same-origin: mantém o cookie de sessao do Supabase valido nas
  // chamadas pra API mesmo com web e API em dominios diferentes (Vercel/Render).
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    return [{ source: "/api/backend/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
