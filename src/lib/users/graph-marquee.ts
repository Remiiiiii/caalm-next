export type GraphRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function rectsOverlap(a: GraphRect, b: GraphRect) {
	return (
		a.x < b.x + b.width &&
		a.x + a.width > b.x &&
		a.y < b.y + b.height &&
		a.y + a.height > b.y
	);
}

export function pointInRect(
	point: { x: number; y: number },
	rect: GraphRect,
) {
	return (
		point.x >= rect.x &&
		point.x <= rect.x + rect.width &&
		point.y >= rect.y &&
		point.y <= rect.y + rect.height
	);
}

export function isTinyMarquee(rect: GraphRect, minSize = 8) {
	return rect.width < minSize && rect.height < minSize;
}

export function clientDragToFlowRect(
	start: { x: number; y: number },
	end: { x: number; y: number },
): GraphRect {
	return {
		x: Math.min(start.x, end.x),
		y: Math.min(start.y, end.y),
		width: Math.abs(end.x - start.x),
		height: Math.abs(end.y - start.y),
	};
}

export function nodeHitsMarquee(
	node: {
		position: { x: number; y: number };
		measured?: { width?: number; height?: number };
	},
	box: GraphRect,
	fallbackWidth: number,
	fallbackHeight: number,
) {
	return rectsOverlap(box, {
		x: node.position.x,
		y: node.position.y,
		width: node.measured?.width ?? fallbackWidth,
		height: node.measured?.height ?? fallbackHeight,
	});
}

/** Extra space around selected cards so the dashed frame does not sit on the card edge. */
export const SELECTION_FRAME_PAD = 12;

export function selectionBounds(
	nodes: Array<{
		selected?: boolean;
		position: { x: number; y: number };
		measured?: { width?: number; height?: number };
	}>,
	fallbackWidth: number,
	fallbackHeight: number,
	pad = SELECTION_FRAME_PAD,
): GraphRect | null {
	const selected = nodes.filter((node) => node.selected);
	if (selected.length === 0) return null;

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const node of selected) {
		const width = node.measured?.width ?? fallbackWidth;
		const height = node.measured?.height ?? fallbackHeight;
		minX = Math.min(minX, node.position.x);
		minY = Math.min(minY, node.position.y);
		maxX = Math.max(maxX, node.position.x + width);
		maxY = Math.max(maxY, node.position.y + height);
	}

	return {
		x: minX - pad,
		y: minY - pad,
		width: maxX - minX + pad * 2,
		height: maxY - minY + pad * 2,
	};
}
