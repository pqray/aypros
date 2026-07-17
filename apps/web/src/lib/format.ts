const RELATIVE_TIME_STEPS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: "year", seconds: 60 * 60 * 24 * 365 },
  { unit: "month", seconds: 60 * 60 * 24 * 30 },
  { unit: "day", seconds: 60 * 60 * 24 },
  { unit: "hour", seconds: 60 * 60 },
  { unit: "minute", seconds: 60 },
];

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const elapsedSeconds = (date.getTime() - now.getTime()) / 1000;

  for (const step of RELATIVE_TIME_STEPS) {
    if (Math.abs(elapsedSeconds) >= step.seconds) {
      return formatter.format(Math.trunc(elapsedSeconds / step.seconds), step.unit);
    }
  }

  return "agora mesmo";
}
