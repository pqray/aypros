import type { PaginationMeta } from "@aypros/types";

export function paginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  const normalizedPage = Math.max(1, page);
  const normalizedPageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    totalPages,
    hasNextPage: normalizedPage < totalPages,
    hasPreviousPage: normalizedPage > 1,
  };
}
