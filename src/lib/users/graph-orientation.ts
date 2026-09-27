export type GraphOrientation = "ltr" | "tb";

export const GRAPH_ORIENTATION_STORAGE_KEY = "user-graph-orientation";

export function parseGraphOrientation(
	value: string | null | undefined,
): GraphOrientation {
	return value === "tb" ? "tb" : "ltr";
}

export function isTopDownOrientation(
	orientation: GraphOrientation | null | undefined,
): boolean {
	return orientation === "tb";
}
