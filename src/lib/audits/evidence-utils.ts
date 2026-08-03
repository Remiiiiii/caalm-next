import type { AuditEvidenceRow } from "@/lib/audits/types";

/** Drop duplicate obligation rows that share the same document id. */
export function dedupeEvidenceRows(
	rows: AuditEvidenceRow[],
): AuditEvidenceRow[] {
	const seen = new Set<string>();
	return rows.filter((row) => {
		if (seen.has(row.id)) return false;
		seen.add(row.id);
		return true;
	});
}

/** Stable list key when row.id may collide (e.g. legacy truncated ids). */
export function evidenceRowKey(row: AuditEvidenceRow, index: number): string {
	return `${row.id}-${row.dueDate}-${row.title}-${index}`;
}

/** Short display id for the obligations table. */
export function formatEvidenceDisplayId(id: string): string {
	if (id.length <= 10) return id;
	return id.slice(0, 8).toUpperCase();
}
