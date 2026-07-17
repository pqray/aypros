// Pure CSV helpers (specs/17: formula-injection protection + correct escaping).

const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/** Escapes one CSV cell: neutralizes formula injection, then quotes if needed. */
export function escapeCsvCell(value: string): string {
  const guarded = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix))
    ? `'${value}`
    : value;

  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replaceAll('"', '""')}"`;
  }
  return guarded;
}

export function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
