import { NextRequest } from 'next/server';

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGINATION = {
  limit: 25,
  offset: 0,
  maxLimit: 1000,
};

/**
 * Parse pagination parameters from query string
 */
export function parsePaginationParams(request: NextRequest): {
  limit: number;
  offset: number;
} {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    parseInt(
      searchParams.get('limit') || String(DEFAULT_PAGINATION.limit),
      10
    ) || DEFAULT_PAGINATION.limit,
    DEFAULT_PAGINATION.maxLimit
  );
  const offset = Math.max(
    parseInt(
      searchParams.get('offset') || String(DEFAULT_PAGINATION.offset),
      10
    ) || DEFAULT_PAGINATION.offset,
    0
  );

  return { limit, offset };
}

/**
 * Build pagination metadata for response
 */
export function buildPaginationMeta(
  limit: number,
  offset: number,
  total: number
): PaginationMeta {
  return {
    limit,
    offset,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * Calculate pagination values for Appwrite queries
 */
export function getPaginationQueries(limit: number, offset: number) {
  return {
    limit,
    offset,
  };
}
