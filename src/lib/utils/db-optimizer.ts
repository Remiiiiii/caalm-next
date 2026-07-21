/**
 * Database query optimization utilities
 */

import { Query } from "node-appwrite";

/**
 * Optimize query by limiting fields
 */
export function selectFields(fields: string[]): string[] {
	return fields.map((_field) => Query.select(fields));
}

/**
 * Create optimized pagination query
 */
export function createPaginationQuery(page: number, limit: number): string[] {
	const offset = (page - 1) * limit;
	return [Query.limit(limit), Query.offset(offset)];
}

/**
 * Create optimized sort query
 */
export function createSortQuery(
	field: string,
	direction: "asc" | "desc" = "desc",
): string {
	return direction === "asc" ? Query.orderAsc(field) : Query.orderDesc(field);
}

/**
 * Memoized query builder
 */
const queryCache = new Map<string, string[]>();

/**
 * Memoize query construction
 */
export function memoizeQuery<T extends (...args: any[]) => string[]>(
	fn: T,
	keyFn: (...args: Parameters<T>) => string,
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
	orderBy?: { field: string; direction: "asc" | "desc" };
	filters?: string[];
}): string[] {
	const queries: string[] = [];

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
		if (options.orderBy.direction === "asc") {
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
