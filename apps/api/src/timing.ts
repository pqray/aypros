import type { FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    timings?: Array<{ name: string; durationMs: number }>;
  }
}

function durationSince(start: bigint): number {
  return Number(process.hrtime.bigint() - start) / 1_000_000;
}

export function addTiming(request: FastifyRequest, name: string, durationMs: number) {
  request.timings ??= [];
  request.timings.push({ name, durationMs });
}

export async function timed<T>(request: FastifyRequest, name: string, work: () => PromiseLike<T>): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    return await work();
  } finally {
    addTiming(request, name, durationSince(start));
  }
}

export function formatServerTiming(
  totalDurationMs: number,
  timings: Array<{ name: string; durationMs: number }> | undefined,
): string {
  const parts = [`app;dur=${totalDurationMs.toFixed(1)}`];
  for (const timing of timings ?? []) {
    parts.push(`${timing.name};dur=${timing.durationMs.toFixed(1)}`);
  }
  return parts.join(", ");
}
