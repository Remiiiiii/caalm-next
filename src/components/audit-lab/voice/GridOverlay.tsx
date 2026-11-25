import { useId } from "react";
import { cn } from "@/lib/utils";

// Swirl + dual sine-wave warp, per "Preview Card Background Gradient & Grid
// Overlay Spec". Coordinates are static (no props involved), so the 38 paths
// are built once at module load rather than recomputed per render/instance.
const GRID_W = 860;
const GRID_H = 860;
const GRID_LINES = 19;
const GRID_SEGS = 32;
const GRID_CX = 300;
const GRID_CY = 140;
const GRID_MAXR = 560;
const GRID_STRENGTH = 1.55;
const WAVE_A1 = 17;
const WAVE_L1 = 125;
const WAVE_P1 = 0.6;
const WAVE_A2 = 10;
const WAVE_L2 = 235;
const WAVE_P2 = 2.1;
const CORNER_MAXDIST = Math.max(
	Math.hypot(0 - GRID_CX, 0 - GRID_CY),
	Math.hypot(GRID_W - GRID_CX, 0 - GRID_CY),
	Math.hypot(0 - GRID_CX, GRID_H - GRID_CY),
	Math.hypot(GRID_W - GRID_CX, GRID_H - GRID_CY),
);

function warpPoint(x: number, y: number) {
	const dx = x - GRID_CX;
	const dy = y - GRID_CY;
	const r = Math.hypot(dx, dy);
	const t = Math.max(0, 1 - r / GRID_MAXR);
	const angle = Math.atan2(dy, dx) + GRID_STRENGTH * t * t;
	let wx = GRID_CX + r * Math.cos(angle);
	let wy = GRID_CY + r * Math.sin(angle);
	wx +=
		WAVE_A1 * Math.sin(y / WAVE_L1 + WAVE_P1) +
		WAVE_A2 * Math.sin(y / WAVE_L2 + WAVE_P2);
	wy +=
		WAVE_A1 * Math.sin(x / WAVE_L1 + WAVE_P1 + 1.3) +
		WAVE_A2 * Math.sin(x / WAVE_L2 + WAVE_P2 + 0.7);
	return { wx, wy, r };
}

function buildGridLine(isVertical: boolean, basePos: number) {
	let d = "";
	let rSum = 0;
	for (let i = 0; i <= GRID_SEGS; i++) {
		const along = (isVertical ? GRID_H : GRID_W) * (i / GRID_SEGS);
		const x = isVertical ? basePos : along;
		const y = isVertical ? along : basePos;
		const { wx, wy, r } = warpPoint(x, y);
		rSum += r;
		d += `${i === 0 ? "M" : "L"} ${wx.toFixed(2)} ${wy.toFixed(2)} `;
	}
	const depthT = Math.min(1, rSum / (GRID_SEGS + 1) / CORNER_MAXDIST);
	return { d: d.trim(), op: 0.62 - depthT * 0.42 };
}

const GRID_STEP = GRID_W / (GRID_LINES - 1);
const GRID_OVERLAY_LINES = [
	...Array.from({ length: GRID_LINES }, (_, i) =>
		buildGridLine(true, i * GRID_STEP),
	),
	...Array.from({ length: GRID_LINES }, (_, i) =>
		buildGridLine(false, i * GRID_STEP),
	),
];

/** Shared abstract swirled-grid backdrop — stretches to fill whatever `relative overflow-hidden` container it's placed in. */
export function GridOverlay({
	className,
	opacity = 0.65,
}: {
	className?: string;
	opacity?: number;
}) {
	const gradId = `voiceGridGrad-${useId()}`;
	return (
		<svg
			viewBox={`0 0 ${GRID_W} ${GRID_H}`}
			preserveAspectRatio="none"
			className={cn("pointer-events-none absolute inset-0 z-0 h-full w-full", className)}
			style={{ opacity }}
			aria-hidden
		>
			<defs>
				<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
					<stop offset="100%" stopColor="#ffffff" stopOpacity={0.1} />
				</linearGradient>
			</defs>
			{GRID_OVERLAY_LINES.map((line) => (
				<path
					key={line.d}
					d={line.d}
					stroke={`url(#${gradId})`}
					strokeWidth={1}
					strokeOpacity={line.op}
					fill="none"
					vectorEffect="non-scaling-stroke"
				/>
			))}
		</svg>
	);
}
