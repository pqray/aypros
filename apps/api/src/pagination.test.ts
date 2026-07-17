import { describe, expect, it } from "vitest";
import { paginationMeta } from "./pagination";

describe("paginationMeta", () => {
  it("returns total pages and navigation flags", () => {
    expect(paginationMeta(2, 20, 45)).toEqual({
      page: 2,
      pageSize: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("keeps empty lists as one page for stable UI controls", () => {
    expect(paginationMeta(1, 20, 0)).toMatchObject({
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});
