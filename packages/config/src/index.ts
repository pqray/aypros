// Shared app constants. Keep runtime-free (no I/O, no env reads).

export const discoveryConfig = {
  /** Hard cap of businesses persisted per search (provider cost control). */
  maxResultsPerSearch: 60,
  /** Provider page size (Places Text Search caps at 20). */
  pageSize: 20,
  /** Identical org+city+segment search younger than this is reused instead of re-fetched. */
  reuseWindowHours: 24,
  /** Rate limit: searches created per organization per hour. */
  maxSearchesPerOrgPerHour: 10,
} as const;

export const auditConfig = {
  /** Rate limit: website audits created per organization per hour. */
  maxAuditsPerOrgPerHour: 100,
  /** Small serial/conservative batch for MVP server runtime. */
  maxBatchAuditsPerSearch: 20,
} as const;

export const aiConfig = {
  /** Groq default model (pt-BR quality) and cheaper fallback if it is unavailable. */
  model: "llama-3.3-70b-versatile",
  fallbackModel: "llama-3.1-8b-instant",
  /** Rate limit: AI generations per organization per day (rolling 24h). */
  maxGenerationsPerOrgPerDay: 50,
  /** Provider call timeout. */
  timeoutMs: 30_000,
  /** Output budget per kind — messages are short by design. */
  maxTokensByKind: {
    // summary-v2 é uma análise estruturada em várias seções — precisa de folga.
    commercial_summary: 1536,
    whatsapp_message: 512,
    email_message: 1024,
  },
} as const;

export const businessesConfig = {
  /** Server-side page size options for the businesses table. */
  pageSizes: [10, 20, 50] as const,
  defaultPageSize: 20,
  /** Hard cap of rows in a single CSV export. */
  maxExportRows: 1000,
  /** Rate limit: CSV exports per organization per hour. */
  maxExportsPerOrgPerHour: 10,
  /** Max businesses accepted in one batch action (favorite/audit/export selection). */
  maxBatchSize: 100,
} as const;

export const refreshConfig = {
  /** Google Places details are paid; keep the MVP daily cap conservative. */
  maxPlaceDetailsPerDay: 30,
  /** Small serial batch per scheduler tick. */
  batchSize: 10,
  /** Target freshness for provider business data. */
  placesFreshnessDays: 30,
  /** Target freshness for our HTTP website audit. */
  auditFreshnessDays: 7,
  /** Manual refresh abuse guard per organization. */
  maxManualRefreshesPerOrgPerHour: 10,
  /** In-process scheduler cadence for the MVP. */
  schedulerIntervalMs: 60 * 60 * 1000,
} as const;

export const outreachConfig = {
  /** Leads without contact after this window are visually marked as cooling down. */
  coolingLeadDays: 7,
  /** Keep wa.me URLs comfortably below common browser/share limits. */
  maxWhatsappDraftLength: 1200,
} as const;

export const reportsConfig = {
  /** Rate limit: diagnostic PDFs generated per organization per hour. */
  maxReportsPerOrgPerHour: 20,
} as const;
