import { describe, expect, it } from "vitest";
import {
  parseDashboardActivities,
  parseDashboardMetrics,
  parseDashboardOpportunities,
  parseDashboardPipelineDistribution,
  parseDashboardSearches,
} from "./schemas";

describe("parseDashboardMetrics", () => {
  it("maps snake_case counts to camelCase", () => {
    expect(
      parseDashboardMetrics({
        searches_count: 3,
        businesses_count: 42,
        businesses_without_website_count: 17,
        active_leads_count: 5,
      }),
    ).toEqual({
      searchesCount: 3,
      businessesCount: 42,
      businessesWithoutWebsiteCount: 17,
      activeLeadsCount: 5,
    });
  });

  it("coerces bigint counts serialized as strings", () => {
    expect(
      parseDashboardMetrics({
        searches_count: "12",
        businesses_count: "0",
        businesses_without_website_count: "1",
        active_leads_count: "2",
      }),
    ).toEqual({
      searchesCount: 12,
      businessesCount: 0,
      businessesWithoutWebsiteCount: 1,
      activeLeadsCount: 2,
    });
  });

  it("rejects negative or missing counts", () => {
    expect(() => parseDashboardMetrics({ searches_count: -1 })).toThrow();
    expect(() => parseDashboardMetrics(null)).toThrow();
  });
});

describe("parseDashboardOpportunities", () => {
  it("maps rows and keeps nullable fields", () => {
    const rows = parseDashboardOpportunities([
      {
        business_id: "b1",
        business_name: "Padaria Central",
        city: "Fortaleza",
        state: "CE",
        score: 82,
        level: "very_high",
        main_reason: "Não possui site próprio (+40)",
      },
      {
        business_id: "b2",
        business_name: "Oficina do Zé",
        city: null,
        state: null,
        score: 65,
        level: "high",
        main_reason: null,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      businessId: "b1",
      businessName: "Padaria Central",
      score: 82,
      level: "very_high",
      mainReason: "Não possui site próprio (+40)",
    });
    expect(rows[1]).toMatchObject({ city: null, state: null, mainReason: null });
  });

  it("rejects unknown levels and out-of-range scores", () => {
    const base = {
      business_id: "b1",
      business_name: "X",
      city: null,
      state: null,
      main_reason: null,
    };
    expect(() => parseDashboardOpportunities([{ ...base, score: 50, level: "huge" }])).toThrow();
    expect(() => parseDashboardOpportunities([{ ...base, score: 101, level: "high" }])).toThrow();
  });
});

describe("parseDashboardSearches", () => {
  it("maps rows with status enum", () => {
    const rows = parseDashboardSearches([
      {
        id: "s1",
        city: "Fortaleza",
        state: "CE",
        segment: "Restaurantes",
        status: "completed",
        total_found: 37,
        created_at: "2026-07-16T12:00:00Z",
      },
    ]);

    expect(rows[0]).toEqual({
      id: "s1",
      city: "Fortaleza",
      state: "CE",
      segment: "Restaurantes",
      status: "completed",
      totalFound: 37,
      createdAt: "2026-07-16T12:00:00Z",
    });
  });

  it("rejects unknown status", () => {
    expect(() =>
      parseDashboardSearches([
        {
          id: "s1",
          city: "F",
          state: "CE",
          segment: "R",
          status: "done",
          total_found: 0,
          created_at: "2026-07-16T12:00:00Z",
        },
      ]),
    ).toThrow();
  });
});

describe("parseDashboardActivities", () => {
  it("maps rows and defaults payload to empty object", () => {
    const rows = parseDashboardActivities([
      { id: "a1", type: "search_created", payload: { city: "Fortaleza" }, created_at: "2026-07-16T12:00:00Z" },
      { id: "a2", type: "business_created", created_at: "2026-07-16T13:00:00Z" },
    ]);

    expect(rows[0]).toEqual({
      id: "a1",
      type: "search_created",
      payload: { city: "Fortaleza" },
      createdAt: "2026-07-16T12:00:00Z",
    });
    expect(rows[1]).toEqual({
      id: "a2",
      type: "business_created",
      payload: {},
      createdAt: "2026-07-16T13:00:00Z",
    });
  });

  it("rejects unknown activity types", () => {
    expect(() =>
      parseDashboardActivities([
        { id: "a1", type: "mystery", payload: {}, created_at: "2026-07-16T12:00:00Z" },
      ]),
    ).toThrow();
  });
});

describe("parseDashboardPipelineDistribution", () => {
  it("maps stage counts and coerces bigint strings", () => {
    const rows = parseDashboardPipelineDistribution([
      { stage: "new", count: "3" },
      { stage: "won", count: 0 },
    ]);

    expect(rows).toEqual([
      { stage: "new", count: 3 },
      { stage: "won", count: 0 },
    ]);
  });

  it("rejects unknown stages and negative counts", () => {
    expect(() => parseDashboardPipelineDistribution([{ stage: "archived", count: 1 }])).toThrow();
    expect(() => parseDashboardPipelineDistribution([{ stage: "new", count: -1 }])).toThrow();
  });
});
