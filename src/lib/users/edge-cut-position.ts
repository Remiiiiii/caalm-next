export type FlowPoint = { x: number; y: number };

export type CubicBezier = {
	p0: FlowPoint;
	p1: FlowPoint;
	p2: FlowPoint;
	p3: FlowPoint;
};

const PATH_COMMANDS =
	/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*C\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)/i;

/** Read the cubic control points React Flow writes into `getBezierPath`. */
export function parseCubicBezierPath(d: string): CubicBezier | null {
	const match = d.match(PATH_COMMANDS);
	if (!match) return null;
	return {
		p0: { x: Number(match[1]), y: Number(match[2]) },
		p1: { x: Number(match[3]), y: Number(match[4]) },
		p2: { x: Number(match[5]), y: Number(match[6]) },
		p3: { x: Number(match[7]), y: Number(match[8]) },
	};
}

export function cubicBezierPoint(t: number, curve: CubicBezier): FlowPoint {
	const u = 1 - t;
	const tt = t * t;
	const uu = u * u;
	return {
		x:
			uu * u * curve.p0.x +
			3 * uu * t * curve.p1.x +
			3 * u * tt * curve.p2.x +
			tt * t * curve.p3.x,
		y:
			uu * u * curve.p0.y +
			3 * uu * t * curve.p1.y +
			3 * u * tt * curve.p2.y +
			tt * t * curve.p3.y,
	};
}

/** Snap a pointer to the nearest point on the connection curve. */
export function closestPointOnCubicBezier(
	point: FlowPoint,
	curve: CubicBezier,
	samples = 48,
): FlowPoint {
	let bestT = 0;
	let bestDist = Number.POSITIVE_INFINITY;
	for (let i = 0; i <= samples; i += 1) {
		const t = i / samples;
		const candidate = cubicBezierPoint(t, curve);
		const dist =
			(candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
		if (dist < bestDist) {
			bestDist = dist;
			bestT = t;
		}
	}

	const refineSpan = 1 / samples;
	const refineSteps = 8;
	const start = Math.max(0, bestT - refineSpan);
	const end = Math.min(1, bestT + refineSpan);
	for (let i = 0; i <= refineSteps; i += 1) {
		const t = start + ((end - start) * i) / refineSteps;
		const candidate = cubicBezierPoint(t, curve);
		const dist =
			(candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;
		if (dist < bestDist) {
			bestDist = dist;
			bestT = t;
		}
	}

	return cubicBezierPoint(bestT, curve);
}

export function cutPositionAlongEdge(
	edgePath: string,
	pointer: FlowPoint,
	fallback: FlowPoint,
): FlowPoint {
	const curve = parseCubicBezierPath(edgePath);
	if (!curve) return fallback;
	return closestPointOnCubicBezier(pointer, curve);
}
