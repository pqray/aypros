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
