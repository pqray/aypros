import { date, index, jsonb, numeric, pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

/**
 * Schema Postgres separado ("ayhub") para o módulo de gestão de clientes e
 * sites — mantido fora do schema `public` de prospecção (specs/decisions/011).
 */
export const ayhub = pgSchema("ayhub");

export const ayhubClientStatus = ayhub.enum("client_status", ["active", "inactive", "delinquent"]);
export const ayhubClientOrigin = ayhub.enum("client_origin", ["pipeline", "manual"]);
export const ayhubSiteStatus = ayhub.enum("site_status", ["development", "live", "maintenance", "paused"]);
export const ayhubOwner = ayhub.enum("owner", ["me", "client"]);
export const ayhubCostType = ayhub.enum("cost_type", ["domain", "hosting", "storage", "other"]);
export const ayhubFrequency = ayhub.enum("frequency", ["monthly", "yearly", "once"]);
export const ayhubContentBlockType = ayhub.enum("content_block_type", ["text", "image", "list"]);
export const ayhubContentBlockStatus = ayhub.enum("content_block_status", ["draft", "published"]);

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const ayhubClients = ayhub.table(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    name: text("name").notNull(),
    contact: text("contact"),
    maintenanceValue: numeric("maintenance_value"),
    status: ayhubClientStatus("status").notNull().default("active"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
    origin: ayhubClientOrigin("origin").notNull(),
    originLeadId: uuid("origin_lead_id"),
    createdAt,
  },
  (table) => [
    index("ayhub_clients_org_idx").on(table.organizationId),
    index("ayhub_clients_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const ayhubSites = ayhub.table(
  "sites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    clientId: uuid("client_id").notNull(),
    slug: text("slug").notNull(),
    domain: text("domain"),
    domainOwner: ayhubOwner("domain_owner").notNull().default("me"),
    deliveryDate: timestamp("delivery_date", { withTimezone: true }),
    status: ayhubSiteStatus("status").notNull().default("development"),
    createdAt,
  },
  (table) => [
    unique().on(table.slug),
    index("ayhub_sites_org_idx").on(table.organizationId),
    index("ayhub_sites_client_idx").on(table.clientId),
    index("ayhub_sites_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const ayhubSiteKeys = ayhub.table(
  "site_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    siteId: uuid("site_id").notNull(),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    unique().on(table.keyHash),
    index("ayhub_site_keys_org_idx").on(table.organizationId),
    index("ayhub_site_keys_site_idx").on(table.siteId),
  ],
);

export const ayhubSiteCosts = ayhub.table(
  "site_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    siteId: uuid("site_id").notNull(),
    type: ayhubCostType("type").notNull(),
    amount: numeric("amount").notNull(),
    frequency: ayhubFrequency("frequency").notNull(),
    nextRenewal: date("next_renewal"),
    paymentOwner: ayhubOwner("payment_owner").notNull().default("me"),
    createdAt,
  },
  (table) => [
    index("ayhub_site_costs_org_idx").on(table.organizationId),
    index("ayhub_site_costs_site_idx").on(table.siteId),
    index("ayhub_site_costs_org_next_renewal_idx").on(table.organizationId, table.nextRenewal),
  ],
);

export const ayhubContentBlocks = ayhub.table(
  "content_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    siteId: uuid("site_id").notNull(),
    key: text("key").notNull(),
    type: ayhubContentBlockType("type").notNull().default("text"),
    draftValue: jsonb("draft_value"),
    publishedValue: jsonb("published_value"),
    status: ayhubContentBlockStatus("status").notNull().default("draft"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    unique().on(table.siteId, table.key),
    index("ayhub_content_blocks_org_idx").on(table.organizationId),
    index("ayhub_content_blocks_site_idx").on(table.siteId),
  ],
);

export const ayhubPayments = ayhub.table(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    clientId: uuid("client_id").notNull(),
    amount: numeric("amount").notNull(),
    date: date("date").notNull(),
    createdAt,
  },
  (table) => [
    index("ayhub_payments_org_idx").on(table.organizationId),
    index("ayhub_payments_client_idx").on(table.clientId),
    index("ayhub_payments_client_date_idx").on(table.clientId, table.date),
  ],
);

export type AyhubClient = typeof ayhubClients.$inferSelect;
export type AyhubSite = typeof ayhubSites.$inferSelect;
export type AyhubSiteKey = typeof ayhubSiteKeys.$inferSelect;
export type AyhubSiteCost = typeof ayhubSiteCosts.$inferSelect;
export type AyhubContentBlock = typeof ayhubContentBlocks.$inferSelect;
export type AyhubPayment = typeof ayhubPayments.$inferSelect;
