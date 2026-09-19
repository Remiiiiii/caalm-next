import type { GraphOrientation } from "@/lib/users/graph-orientation";

export type GraphUndoLineage = "reporting" | "assignment";

export type GraphUndoPoint = { x: number; y: number };

export type LastGraphMove = {
	nodes: Array<{ id: string; from: GraphUndoPoint }>;
	lineage: GraphUndoLineage;
	orientation: GraphOrientation;
};

export type LastGraphCut = {
	targetUserId: string;
	sourceId: string;
	lineage: GraphUndoLineage;
};

type CuttableEdge = {
	source: string;
	target: string;
	data?: { dashed?: boolean; canEditGraph?: boolean } | null;
};

/** Solid inbound edge that scissors remove (skip dashes and layout-only lines). */
export function isSolidCuttableEdge(edge: CuttableEdge): boolean {
	if (edge.data?.dashed) return false;
	if (edge.data?.canEditGraph === false) return false;
	return true;
}

export function lastSolidInboundCut(
	edges: CuttableEdge[],
	targetUserId: string,
): LastGraphCut | null {
	const edge = edges.find(
		(item) => item.target === targetUserId && isSolidCuttableEdge(item),
	);
	if (!edge?.source) return null;
	return {
		targetUserId,
		sourceId: edge.source,
		lineage: "reporting",
	};
}

export function withCutLineage(
	cut: LastGraphCut,
	lineage: GraphUndoLineage,
): LastGraphCut {
	return { ...cut, lineage };
}

/** Cards that actually moved in this drag (skip clicks that did not change x/y). */
export function lastGraphMoveFromDrag(
	starts: ReadonlyMap<string, GraphUndoPoint>,
	ends: ReadonlyArray<{ id: string; position: GraphUndoPoint }>,
	lineage: GraphUndoLineage,
	orientation: GraphOrientation,
): LastGraphMove | null {
	const nodes: LastGraphMove["nodes"] = [];
	for (const end of ends) {
		const from = starts.get(end.id);
		if (!from) continue;
		if (from.x === end.position.x && from.y === end.position.y) continue;
		nodes.push({ id: end.id, from: { x: from.x, y: from.y } });
	}
	if (nodes.length === 0) return null;
	return { nodes, lineage, orientation };
}

function isTypingTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	return target.isContentEditable;
}

/** Ctrl+Z (Windows) or Cmd+Z (Mac). Skip when the user is typing in a field. */
export function isUndoLastCutHotkey(event: {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	defaultPrevented: boolean;
	target: EventTarget | null;
}): boolean {
	if (event.defaultPrevented) return false;
	if (event.altKey || event.shiftKey) return false;
	if (!(event.ctrlKey || event.metaKey)) return false;
	if (event.key !== "z" && event.key !== "Z") return false;
	if (isTypingTarget(event.target)) return false;
	return true;
}
