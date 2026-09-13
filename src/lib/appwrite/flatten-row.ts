/**
 * Appwrite TablesDB may return column values flat on the row, or nested under
 * `data`. Merge so callers can always read `row.avatar`, `row.fullName`, etc.
 */
export function flattenTableRow<T extends Record<string, unknown>>(
	row: T | null | undefined,
): T & Record<string, unknown> {
	if (!row || typeof row !== "object") {
		return (row || {}) as T & Record<string, unknown>;
	}
	const data = (row as { data?: unknown }).data;
	if (data && typeof data === "object" && !Array.isArray(data)) {
		const { data: _nested, ...rest } = row as T & {
			data: Record<string, unknown>;
		};
		return { ...rest, ...data } as T & Record<string, unknown>;
	}
	return row as T & Record<string, unknown>;
}
