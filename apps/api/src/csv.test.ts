import { describe, expect, it } from "vitest";
import { buildCsv, escapeCsvCell } from "./csv";

describe("escapeCsvCell", () => {
  it("passes through plain text unchanged", () => {
    expect(escapeCsvCell("Padaria Central")).toBe("Padaria Central");
  });

  it.each([
    ["=SUM(A1:A9)", "'=SUM(A1:A9)"],
    ["+5551234", "'+5551234"],
    ["-5551234", "'-5551234"],
    ["@mention", "'@mention"],
  ])("neutralizes formula-injection prefix %s", (input, expected) => {
    expect(escapeCsvCell(input)).toBe(expected);
  });

  it("quotes cells containing commas", () => {
    expect(escapeCsvCell("Rua A, 100")).toBe('"Rua A, 100"');
  });

  it("quotes and doubles internal quotes", () => {
    expect(escapeCsvCell('Padaria "Central"')).toBe('"Padaria ""Central"""');
  });

  it("quotes cells containing newlines", () => {
    expect(escapeCsvCell("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });

  it("quotes a formula-prefixed cell that also has a comma", () => {
    expect(escapeCsvCell("=A1, B1")).toBe('"\'=A1, B1"');
  });
});

describe("buildCsv", () => {
  it("joins rows with CRLF and cells with commas", () => {
    const csv = buildCsv([
      ["Nome", "Cidade"],
      ["Padaria Central", "Fortaleza"],
      ["=EVIL()", "Sobral"],
    ]);

    expect(csv).toBe(
      "Nome,Cidade\r\nPadaria Central,Fortaleza\r\n'=EVIL(),Sobral",
    );
  });
});
