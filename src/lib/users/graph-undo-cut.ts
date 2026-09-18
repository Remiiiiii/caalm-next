export type GraphUndoLineage = "reporting" | "assignment";

export type LastGraphCut = {
	targetUserId: string;
	sourceId: string;
	lineage: GraphUndoLineage;
};

type CuttableEdge = {
	source: string;
	target: string;
	data?: { dashed?: boolean } | null;
};

/** Solid inbound edge that scissors remove (skip dashed matrix lines). */
export function lastSolidInboundCut(
	edges: CuttableEdge[],
	targetUserId: string,
): LastGraphCut | null {
	const edge = edges.find(
		(item) => item.target === targetUserId && !item.data?.dashed,
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
