import { describe, expect, it } from "vitest";
import { ensureAssignedMember, reorderColumn } from "./leads";

describe("reorderColumn", () => {
  it("inserts the moved lead at the target index", () => {
    expect(reorderColumn(["a", "b", "c"], "x", 1)).toEqual(["a", "x", "b", "c"]);
  });

  it("appends to the end when the target index equals the column length", () => {
    expect(reorderColumn(["a", "b"], "x", 2)).toEqual(["a", "b", "x"]);
  });

  it("inserts at the front when the target index is 0", () => {
    expect(reorderColumn(["a", "b"], "x", 0)).toEqual(["x", "a", "b"]);
  });

  it("clamps a negative index to the front", () => {
    expect(reorderColumn(["a", "b"], "x", -5)).toEqual(["x", "a", "b"]);
  });

  it("clamps an out-of-range index to the end", () => {
    expect(reorderColumn(["a", "b"], "x", 99)).toEqual(["a", "b", "x"]);
  });

  it("handles moving into an empty column", () => {
    expect(reorderColumn([], "x", 0)).toEqual(["x"]);
  });

  it("supports reordering within the same column (moved lead pre-excluded by the caller)", () => {
    // e.g. moving "b" from index 1 to index 0 in ["a", "b", "c"]:
    // the caller queries siblings excluding "b" first, i.e. ["a", "c"].
    expect(reorderColumn(["a", "c"], "b", 0)).toEqual(["b", "a", "c"]);
  });
});

describe("ensureAssignedMember", () => {
  function dbWithResult(result: { data: unknown; error: { message: string } | null }) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: async () => result,
    };
    return { from: () => builder };
  }

  it("accepts null assignee", async () => {
    await expect(ensureAssignedMember(dbWithResult({ data: null, error: null }) as never, "org1", null)).resolves.toBeNull();
  });

  it("accepts users that are members of the organization", async () => {
    await expect(
      ensureAssignedMember(dbWithResult({ data: { user_id: "u1" }, error: null }) as never, "org1", "u1"),
    ).resolves.toBe("u1");
  });

  it("rejects users outside the organization", async () => {
    await expect(
      ensureAssignedMember(dbWithResult({ data: null, error: null }) as never, "org1", "u2"),
    ).resolves.toBeUndefined();
  });
});
