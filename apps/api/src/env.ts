import { existsSync } from "node:fs";
import { resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

for (const file of [resolve(process.cwd(), "../../.env.local"), resolve(process.cwd(), ".env.local")]) {
  if (existsSync(file)) {
    dotenv.config({ path: file, override: false, quiet: true });
  }
}

const envSchema = z.object({
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_LOG_LEVEL: z.string().default("info"),
  WEB_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
