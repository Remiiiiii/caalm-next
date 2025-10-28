/**
 * Database query optimization utilities
 */

import { Query } from 'node-appwrite';

/**
 * Optimize query by limiting fields
 */
export function selectFields(fields: string[]): Query[] {
  return fields.map((field) => Query.select(fields));
}

/**
 * Create optimized pagination query
 */
export function createPaginationQuery(page: number, limit: number): Query[] {
  const offset = (page - 1) * limit;
  return [Query.limit(limit), Query.offset(offset)];
}

/**
 * Create optimized sort query
 */
export function createSortQuery(
  field: string,
  direction: 'asc' | 'desc' = 'desc'
): Query {
  return direction === 'asc' ? Query.orderAsc(field) : Query.orderDesc(field);
}

/**
 * Memoized query builder
 */
const queryCache = new Map<string, Query[]>();

/**
 * Memoize query construction
 */
export function memoizeQuery<T extends (...args: any[]) => Query[]>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string
): T {
  return ((...args: Parameters<T>) => {
    const key = keyFn(...args);

    if (queryCache.has(key)) {
      return queryCache.get(key)!;
    }

    const queries = fn(...args);
    queryCache.set(key, queries);

    return queries;
  }) as T;
}

/**
 * Clear query cache
 */
export function clearQueryCache() {
  queryCache.clear();
}

/**
 * Optimize complex queries with field selection
 */
export function optimizeQuery(options: {
  fields?: string[];
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  filters?: Query[];
}): Query[] {
  const queries: Query[] = [];

  // Add field selection if specified
  if (options.fields && options.fields.length > 0) {
    queries.push(Query.select(options.fields));
  }

  // Add filters
  if (options.filters) {
    queries.push(...options.filters);
  }

  // Add sorting
  if (options.orderBy) {
    if (options.orderBy.direction === 'asc') {
      queries.push(Query.orderAsc(options.orderBy.field));
    } else {
      queries.push(Query.orderDesc(options.orderBy.field));
    }
  }

  // Add pagination
  if (options.limit) {
    queries.push(Query.limit(options.limit));
  }
  if (options.offset) {
    queries.push(Query.offset(options.offset));
  }

  return queries;
}
