import { describe, expect, it } from "vitest";
import {
  businessIdsSchema,
  businessListQuerySchema,
  createManualBusinessSchema,
  createNoteSchema,
  createSearchSchema,
  generateAiSchema,
  savedFilterCreateSchema,
  updateLeadSchema,
} from "./index";

describe("createSearchSchema", () => {
  it("accepts city + segment and normalizes the UF", () => {
    const result = createSearchSchema.parse({ city: " Fortaleza ", state: "ce", segment: "Padarias" });
    expect(result).toEqual({ city: "Fortaleza", state: "CE", segment: "Padarias" });
  });

  it("treats an empty UF as undefined", () => {
    const result = createSearchSchema.parse({ city: "Fortaleza", state: "", segment: "Padarias" });
    expect(result.state).toBeUndefined();
  });

  it("rejects a 1-char city and an invalid UF", () => {
    expect(createSearchSchema.safeParse({ city: "F", segment: "Padarias" }).success).toBe(false);
    expect(
      createSearchSchema.safeParse({ city: "Fortaleza", state: "Ceará", segment: "Padarias" }).success,
    ).toBe(false);
  });
});

describe("createManualBusinessSchema", () => {
  it("accepts a business with instagram only", () => {
    const result = createManualBusinessSchema.parse({
      name: " Doceria da Ana ",
      segment: " Doceria ",
      instagramUrl: " @doceriadaana ",
    });

    expect(result).toEqual({
      name: "Doceria da Ana",
      segment: "Doceria",
      instagramUrl: "@doceriadaana",
    });
  });

  it("accepts site and optional location fields", () => {
    const result = createManualBusinessSchema.parse({
      name: "Padaria Central",
      segment: "Padaria",
      city: " Fortaleza ",
      state: "ce",
      websiteUrl: "padariacentral.com.br",
    });

    expect(result).toMatchObject({
      city: "Fortaleza",
      state: "CE",
      websiteUrl: "padariacentral.com.br",
    });
  });

  it("rejects missing name, segment, and digital presence", () => {
    expect(createManualBusinessSchema.safeParse({ name: "", segment: "Padaria", websiteUrl: "" }).success).toBe(false);
    expect(createManualBusinessSchema.safeParse({ name: "Padaria", segment: "", instagramUrl: "" }).success).toBe(false);
    expect(createManualBusinessSchema.safeParse({ name: "Padaria", segment: "Padaria" }).success).toBe(false);
  });
});

describe("businessListQuerySchema", () => {
  it("applies defaults for an empty query", () => {
    const result = businessListQuerySchema.parse({});
    expect(result).toMatchObject({
      page: 1,
      pageSize: 20,
      websiteFilter: "all",
      segment: "all",
      favoritesOnly: false,
      sortBy: "name",
      sortDir: "asc",
    });
  });

  it("coerces numeric strings from the URL", () => {
    const result = businessListQuerySchema.parse({ page: "3", minScore: "40", minRating: "4.5" });
    expect(result.page).toBe(3);
    expect(result.minScore).toBe(40);
    expect(result.minRating).toBe(4.5);
  });

  it("accepts city and segment filters", () => {
    const result = businessListQuerySchema.parse({ city: " Macaé ", segment: "food_service" });
    expect(result.city).toBe("Macaé");
    expect(result.segment).toBe("food_service");
  });

  it("parses tri-state booleans from strings", () => {
    expect(businessListQuerySchema.parse({ audited: "true" }).audited).toBe(true);
    expect(businessListQuerySchema.parse({ audited: "false" }).audited).toBe(false);
    expect(businessListQuerySchema.parse({}).audited).toBeUndefined();
  });

  it("rejects out-of-range values", () => {
    expect(businessListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(businessListQuerySchema.safeParse({ minScore: "101" }).success).toBe(false);
    expect(businessListQuerySchema.safeParse({ sortBy: "banana" }).success).toBe(false);
  });
});

describe("updateLeadSchema", () => {
  it("rejects an empty patch", () => {
    expect(updateLeadSchema.safeParse({}).success).toBe(false);
  });

  it("accepts nullable clears for value and next action", () => {
    const result = updateLeadSchema.parse({ potentialValue: null, nextAction: null, nextActionAt: null });
    expect(result).toEqual({ potentialValue: null, nextAction: null, nextActionAt: null });
  });

  it("rejects unknown stage and negative value", () => {
    expect(updateLeadSchema.safeParse({ stage: "invalid" }).success).toBe(false);
    expect(updateLeadSchema.safeParse({ potentialValue: -1 }).success).toBe(false);
  });

  it("requires an ISO datetime with offset for nextActionAt", () => {
    expect(updateLeadSchema.safeParse({ nextActionAt: "2026-07-17" }).success).toBe(false);
    expect(updateLeadSchema.safeParse({ nextActionAt: "2026-07-17T10:00:00Z" }).success).toBe(true);
  });

  it("requires a paid monthly hosting cost", () => {
    expect(updateLeadSchema.safeParse({ hostingCostMonthly: 0 }).success).toBe(false);
    expect(updateLeadSchema.safeParse({ hostingCostMonthly: 35 }).success).toBe(true);
  });
});

describe("createNoteSchema", () => {
  it("trims and accepts a non-empty note", () => {
    expect(createNoteSchema.parse({ content: "  ligar amanhã  " })).toEqual({ content: "ligar amanhã" });
  });

  it("rejects whitespace-only content", () => {
    expect(createNoteSchema.safeParse({ content: "   " }).success).toBe(false);
  });
});

describe("generateAiSchema", () => {
  it.each(["commercial_summary", "whatsapp_message", "email_message"] as const)(
    "accepts kind %s",
    (kind) => {
      expect(generateAiSchema.parse({ kind })).toEqual({ kind });
    },
  );

  it("rejects unknown kinds", () => {
    expect(generateAiSchema.safeParse({ kind: "poema" }).success).toBe(false);
  });
});

describe("batch and saved-filter schemas", () => {
  it("caps businessIds at 100 and requires valid uuids", () => {
    const uuid = "5e0c4b9f-95a1-4c3e-9f5a-1b2c3d4e5f60";
    expect(businessIdsSchema.safeParse({ businessIds: [uuid] }).success).toBe(true);
    expect(businessIdsSchema.safeParse({ businessIds: [] }).success).toBe(false);
    expect(businessIdsSchema.safeParse({ businessIds: ["not-a-uuid"] }).success).toBe(false);
    expect(
      businessIdsSchema.safeParse({ businessIds: Array.from({ length: 101 }, () => uuid) }).success,
    ).toBe(false);
  });

  it("requires a name for saved filters", () => {
    expect(savedFilterCreateSchema.safeParse({ name: "", filters: {} }).success).toBe(false);
    expect(savedFilterCreateSchema.safeParse({ name: "Sem site", filters: { websiteFilter: "without_site" } }).success).toBe(true);
  });
});
