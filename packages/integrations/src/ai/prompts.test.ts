import { describe, expect, it } from "vitest";
import { buildCorrectiveMessages, buildPromptMessages, promptVersions } from "./prompts";
import type { AiInput, AiKind } from "./types";

const input: AiInput = {
  business: {
    name: "Padaria Central",
    city: "Fortaleza",
    state: "CE",
    categories: [],
    rating: null,
    reviewCount: null,
    hasWebsite: false,
    websiteUrl: null,
    phone: null,
  },
  audit: null,
  score: null,
  sender: { name: null, organization: null },
};

const kinds: AiKind[] = ["commercial_summary", "whatsapp_message", "email_message"];

describe("buildPromptMessages", () => {
  it.each(kinds)("embeds the anti-hallucination rules for %s", (kind) => {
    const [system] = buildPromptMessages(kind, input);
    expect(system?.role).toBe("system");
    expect(system?.content).toContain("SOMENTE os fatos");
    expect(system?.content).toContain("inconclusive");
    expect(system?.content).toContain("JSON");
  });

  it("sends the structured input as JSON in the user message", () => {
    const messages = buildPromptMessages("whatsapp_message", input);
    const user = messages.at(-1);
    expect(user?.role).toBe("user");
    expect(JSON.parse(user!.content.slice(user!.content.indexOf("{")))).toMatchObject({
      business: { name: "Padaria Central" },
    });
  });
});

describe("buildCorrectiveMessages", () => {
  it("appends the invalid output and a corrective instruction", () => {
    const messages = buildCorrectiveMessages("email_message", input, "oops not json");
    expect(messages).toHaveLength(3);
    expect(messages.at(-1)?.content).toContain("oops not json");
    expect(messages.at(-1)?.content).toContain("APENAS com o objeto JSON");
  });

  it("truncates a huge invalid output", () => {
    const messages = buildCorrectiveMessages("email_message", input, "x".repeat(10_000));
    expect(messages.at(-1)!.content.length).toBeLessThan(3000);
  });
});

describe("promptVersions", () => {
  it("has one immutable version id per kind", () => {
    expect(promptVersions).toEqual({
      commercial_summary: "summary-v1",
      whatsapp_message: "whatsapp-v1",
      email_message: "email-v1",
    });
  });
});
