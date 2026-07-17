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
  // "::" escuta IPv6 e IPv4 (dual-stack): localhost resolve para ::1 primeiro e,
  // sem listener IPv6, cada request paga ~200ms de fallback ate o 0.0.0.0
  API_HOST: z.string().default("::"),
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
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GOOGLE_PLACES_API_KEY: z.string().min(1),
  REFRESH_ENABLED: z
    .string()
    .default("true")
    .transform((value) => value !== "false" && value !== "0"),
  // Opcional de propósito: sem chave a rota de IA responde 503, o resto do produto segue vivo.
  GROQ_API_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
