import { describe, expect, it } from "vitest";
import { pipelinePath } from "./api";

describe("pipelinePath", () => {
  it("omits assigned filter for all leads", () => {
    expect(pipelinePath("all")).toBe("/v1/pipeline");
  });

  it("adds assignedTo=me for my leads", () => {
    expect(pipelinePath("mine")).toBe("/v1/pipeline?assignedTo=me");
  });
});
