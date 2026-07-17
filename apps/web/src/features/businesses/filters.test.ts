import { describe, expect, it } from "vitest";
import { applyBusinessListQuery, hasActiveFilters, parseBusinessListQuery } from "./filters";

describe("parseBusinessListQuery", () => {
  it("returns defaults for an empty URL", () => {
    expect(parseBusinessListQuery(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: 20,
      websiteFilter: "all",
      segment: "all",
      city: undefined,
      minScore: undefined,
      maxScore: undefined,
      minRating: undefined,
      audited: undefined,
      inPipeline: undefined,
      search: undefined,
      sortBy: "name",
      sortDir: "asc",
    });
  });

  it("parses every param from the URL", () => {
    const params = new URLSearchParams(
      "page=2&pageSize=50&websiteFilter=without_site&segment=food_service&city=Fortaleza&minScore=40&maxScore=90&minRating=3.5&audited=true&inPipeline=false&search=padaria&sortBy=score&sortDir=desc",
    );

    expect(parseBusinessListQuery(params)).toEqual({
      page: 2,
      pageSize: 50,
      websiteFilter: "without_site",
      segment: "food_service",
      city: "Fortaleza",
      minScore: 40,
      maxScore: 90,
      minRating: 3.5,
      audited: true,
      inPipeline: false,
      search: "padaria",
      sortBy: "score",
      sortDir: "desc",
    });
  });

  it("falls back to defaults for invalid values", () => {
    const params = new URLSearchParams("page=abc&pageSize=999&websiteFilter=bogus&sortBy=bogus");

    const result = parseBusinessListQuery(params);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.websiteFilter).toBe("all");
    expect(result.sortBy).toBe("name");
  });
});

describe("applyBusinessListQuery", () => {
  it("sets provided values and removes defaulted ones", () => {
    const current = new URLSearchParams("page=3&search=old");
    const next = applyBusinessListQuery(current, { search: "padaria", websiteFilter: "with_site" });

    expect(next.get("search")).toBe("padaria");
    expect(next.get("websiteFilter")).toBe("with_site");
    expect(next.get("page")).toBe("3");
  });

  it("drops keys that go back to their default value", () => {
    const current = new URLSearchParams("websiteFilter=with_site&sortBy=score&sortDir=desc&page=2");
    const next = applyBusinessListQuery(current, {
      websiteFilter: "all",
      sortBy: "name",
      sortDir: "asc",
      page: 1,
      pageSize: 20,
    });

    expect(next.has("websiteFilter")).toBe(false);
    expect(next.has("sortBy")).toBe(false);
    expect(next.has("sortDir")).toBe(false);
    expect(next.has("page")).toBe(false);
    expect(next.has("pageSize")).toBe(false);
  });

  it("removes a key when set to undefined", () => {
    const current = new URLSearchParams("search=padaria");
    const next = applyBusinessListQuery(current, { search: undefined });

    expect(next.has("search")).toBe(false);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the default query", () => {
    expect(
      hasActiveFilters({
        page: 1,
        pageSize: 20,
        websiteFilter: "all",
        segment: "all",
        sortBy: "name",
        sortDir: "asc",
      }),
    ).toBe(false);
  });

  it("is true when any filter is set", () => {
    expect(hasActiveFilters({ websiteFilter: "without_site" })).toBe(true);
    expect(hasActiveFilters({ segment: "services" })).toBe(true);
    expect(hasActiveFilters({ city: "Macaé" })).toBe(true);
    expect(hasActiveFilters({ minScore: 40 })).toBe(true);
    expect(hasActiveFilters({ audited: true })).toBe(true);
    expect(hasActiveFilters({ search: "padaria" })).toBe(true);
  });
});
