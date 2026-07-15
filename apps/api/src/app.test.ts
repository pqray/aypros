import { describe, expect, it } from "vitest";
import { buildApp } from "./app";

describe("api app", () => {
  it("returns health status", async () => {
    const app = buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    await app.close();
  });
});
