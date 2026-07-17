import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Workspace packages ship raw TypeScript; they must be bundled, not required at runtime.
  noExternal: [/^@aypros\//],
});
