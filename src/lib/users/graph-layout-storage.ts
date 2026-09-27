import type { GraphOrientation } from "@/lib/users/graph-orientation";

type GraphLineage = "reporting" | "assignment";

export type GraphLayoutPoint = { x: number; y: number };

export function graphLayoutStorageKey(
	lineage: GraphLineage,
	orientation: GraphOrientation,
): string {
	return `user-graph-positions:${lineage}:${orientation}`;
}

function isPoint(value: unknown): value is GraphLayoutPoint {
	if (!value || typeof value !== "object") return false;
	const point = value as { x?: unknown; y?: unknown };
	return Number.isFinite(point.x) && Number.isFinite(point.y);
}

/** Browser-only spots for layouts that do not use the Side reporting API fields. */
export function readGraphLayoutPositions(
	lineage: GraphLineage,
	orientation: GraphOrientation,
): Map<string, GraphLayoutPoint> {
	const result = new Map<string, GraphLayoutPoint>();
	if (typeof window === "undefined") return result;
	try {
		const raw = window.localStorage.getItem(
			graphLayoutStorageKey(lineage, orientation),
		);
		if (!raw) return result;
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		for (const [id, value] of Object.entries(parsed)) {
			if (!id || !isPoint(value)) continue;
			result.set(id, { x: value.x, y: value.y });
		}
	} catch {
		return result;
	}
	return result;
}

export function writeGraphLayoutPositions(
	lineage: GraphLineage,
	orientation: GraphOrientation,
	positions: Map<string, GraphLayoutPoint>,
): void {
	if (typeof window === "undefined") return;
	const payload: Record<string, GraphLayoutPoint> = {};
	for (const [id, point] of positions) {
		if (!id || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
		payload[id] = { x: point.x, y: point.y };
	}
	window.localStorage.setItem(
		graphLayoutStorageKey(lineage, orientation),
		JSON.stringify(payload),
	);
}
