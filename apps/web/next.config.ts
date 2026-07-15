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
};

export default nextConfig;
