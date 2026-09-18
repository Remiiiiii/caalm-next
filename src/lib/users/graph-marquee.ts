export function rectsOverlap(
	a: { x: number; y: number; width: number; height: number },
	b: { x: number; y: number; width: number; height: number },
) {
	return (
		a.x < b.x + b.width &&
		a.x + a.width > b.x &&
		a.y < b.y + b.height &&
		a.y + a.height > b.y
	);
}

export function nodeHitsMarquee(
	node: {
		position: { x: number; y: number };
		measured?: { width?: number; height?: number };
	},
	box: { x: number; y: number; width: number; height: number },
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
