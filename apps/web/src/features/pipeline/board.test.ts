import type { LeadSummary } from "@aypros/types";
import { describe, expect, it } from "vitest";
import { groupByStage, isOverdue, moveLead } from "./board";

function makeLead(overrides: Partial<LeadSummary> = {}): LeadSummary {
  return {
    id: "l1",
    businessId: "b1",
    businessName: "Padaria Central",
    city: "Fortaleza",
    state: "CE",
    websiteUrl: null,
    stage: "new",
    status: "active",
    potentialValue: null,
    nextAction: null,
    nextActionAt: null,
    position: 0,
    score: null,
    scoreLevel: null,
    createdAt: "2026-07-16T12:00:00Z",
    ...overrides,
  };
}

describe("groupByStage", () => {
  it("groups leads into all 6 fixed columns, sorted by position", () => {
    const items = [
      makeLead({ id: "a", stage: "new", position: 1 }),
      makeLead({ id: "b", stage: "new", position: 0 }),
      makeLead({ id: "c", stage: "won", position: 0, potentialValue: 500 }),
    ];

    const columns = groupByStage(items);

    expect(columns).toHaveLength(6);
    expect(columns[0]?.stage).toBe("new");
    expect(columns[0]?.leads.map((lead) => lead.id)).toEqual(["b", "a"]);
    expect(columns[0]?.count).toBe(2);
  });

  it("sums potentialValue per column, treating null as 0", () => {
    const items = [
      makeLead({ id: "a", stage: "proposal_sent", potentialValue: 1000 }),
      makeLead({ id: "b", stage: "proposal_sent", potentialValue: 500 }),
      makeLead({ id: "c", stage: "proposal_sent", potentialValue: null }),
    ];

    const columns = groupByStage(items);
    const proposalSent = columns.find((column) => column.stage === "proposal_sent");

    expect(proposalSent?.totalValue).toBe(1500);
  });

  it("returns empty columns for stages with no leads", () => {
    const columns = groupByStage([]);

    expect(columns.every((column) => column.count === 0 && column.totalValue === 0)).toBe(true);
  });
});

describe("moveLead", () => {
  it("reorders within the same column", () => {
    const items = [
      makeLead({ id: "a", stage: "new", position: 0 }),
      makeLead({ id: "b", stage: "new", position: 1 }),
      makeLead({ id: "c", stage: "new", position: 2 }),
    ];

    const result = moveLead(items, "c", "new", 0);
    const positions = Object.fromEntries(result.map((lead) => [lead.id, lead.position]));

    expect(positions).toEqual({ a: 1, b: 2, c: 0 });
  });

  it("moves a lead across columns and reindexes both", () => {
    const items = [
      makeLead({ id: "a", stage: "new", position: 0 }),
      makeLead({ id: "b", stage: "new", position: 1 }),
      makeLead({ id: "c", stage: "contacted", position: 0 }),
    ];

    const result = moveLead(items, "a", "contacted", 0);
    const byId = Object.fromEntries(result.map((lead) => [lead.id, lead]));

    expect(byId.a).toMatchObject({ stage: "contacted", position: 0 });
    expect(byId.c).toMatchObject({ stage: "contacted", position: 1 });
    // Source column reindexed: "b" was the only one left, shifts to position 0.
    expect(byId.b).toMatchObject({ stage: "new", position: 0 });
  });

  it("clamps an out-of-range target index to the end of the column", () => {
    const items = [makeLead({ id: "a", stage: "new", position: 0 })];

    const result = moveLead(items, "a", "won", 99);

    expect(result.find((lead) => lead.id === "a")).toMatchObject({ stage: "won", position: 0 });
  });

  it("returns the same array when the lead id is not found", () => {
    const items = [makeLead({ id: "a" })];

    expect(moveLead(items, "missing", "won", 0)).toBe(items);
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-07-16T12:00:00Z");

  it("is false when there is no next action date", () => {
    expect(isOverdue(null, now)).toBe(false);
  });

  it("is true for a date in the past", () => {
    expect(isOverdue("2026-07-15T12:00:00Z", now)).toBe(true);
  });

  it("is false for a date in the future", () => {
    expect(isOverdue("2026-07-17T12:00:00Z", now)).toBe(false);
  });
});
