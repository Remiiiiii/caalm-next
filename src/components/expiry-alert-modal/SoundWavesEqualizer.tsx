"use client";

import type { CSSProperties } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Bar centers + relative amplitudes from `public/assets/sounds/sound waves.lottie`
 * (34 rounded-rect shape layers). Rendered as SVG so we can paint the same
 * gradient as `.sidebar-gradient-text` (#12477d → #03afbf).
 */
const BARS: { x: number; amp: number }[] = [
	{ x: 12.125, amp: 0.76 },
	{ x: 26.86, amp: 0.18 },
	{ x: 41.595, amp: 0.55 },
	{ x: 56.33, amp: 0.37 },
	{ x: 71.064, amp: 0.28 },
	{ x: 85.799, amp: 0.18 },
	{ x: 100.534, amp: 0.27 },
	{ x: 115.269, amp: 0.47 },
	{ x: 130.004, amp: 0.76 },
	{ x: 144.739, amp: 0.3 },
	{ x: 159.473, amp: 0.57 },
	{ x: 174.208, amp: 0.57 },
	{ x: 188.943, amp: 0.18 },
	{ x: 203.678, amp: 0.46 },
	{ x: 218.413, amp: 0.32 },
	{ x: 233.148, amp: 0.45 },
	{ x: 247.883, amp: 0.75 },
	{ x: 262.617, amp: 1 },
	{ x: 277.352, amp: 0.44 },
	{ x: 292.087, amp: 0.45 },
	{ x: 306.822, amp: 0.55 },
	{ x: 321.557, amp: 0.78 },
	{ x: 336.292, amp: 0.37 },
	{ x: 351.027, amp: 0.28 },
	{ x: 365.761, amp: 0.18 },
	{ x: 380.496, amp: 0.27 },
	{ x: 395.231, amp: 0.47 },
	{ x: 409.966, amp: 0.76 },
	{ x: 424.701, amp: 0.3 },
	{ x: 439.436, amp: 0.57 },
	{ x: 454.17, amp: 0.57 },
	{ x: 468.905, amp: 0.18 },
	{ x: 483.64, amp: 0.46 },
	{ x: 498.375, amp: 0.32 },
];

const BAR_WIDTH = 12;
/** Gap between bars in viewBox units (wider than the original Lottie packing). */
const BAR_GAP = 14;
const BAR_BASE_HEIGHT = 120;
const VIEW_CENTER_Y = 256;
const VIEW_PAD = 16;

function trackWidth(total: number): number {
	return total * BAR_WIDTH + Math.max(0, total - 1) * BAR_GAP;
}

/** Evenly space bars with BAR_WIDTH + BAR_GAP (viewBox grows to fit). */
function barX(index: number): number {
	return VIEW_PAD + index * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2;
}

type SoundWavesEqualizerProps = {
	className?: string;
	/** Render width in px (viewBox stays 512×512). */
	width?: number;
	/** Render height in px (viewBox stays 512×512). */
	height?: number;
};

const DEFAULT_WIDTH = 64;
const DEFAULT_HEIGHT = 40;

export default function SoundWavesEqualizer({
	className,
	width = DEFAULT_WIDTH,
	height = DEFAULT_HEIGHT,
}: SoundWavesEqualizerProps) {
	const reactId = useId().replace(/:/g, "");
	const gradientId = `sound-waves-grad-${reactId}`;
	const viewWidth = trackWidth(BARS.length) + VIEW_PAD * 2;

	return (
		<svg
			viewBox={`0 0 ${viewWidth} 512`}
			width={width}
			height={height}
			className={cn("sound-wave-equalizer sidebar-gradient-text", className)}
			aria-hidden="true"
			focusable="false"
			style={{ width, height }}
		>
			<title>Sound waves</title>
			<defs>
				{/* Same stops as .sidebar-gradient-text (135deg ≈ top-left → bottom-right). */}
				<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#12477d" />
					<stop offset="100%" stopColor="#03afbf" />
				</linearGradient>
			</defs>
			{BARS.map((bar, index) => {
				const peak = Math.max(bar.amp, 0.35);
				const x = barX(index);
				return (
					<rect
						key={`${bar.x}-${index}`}
						x={x - BAR_WIDTH / 2}
						y={VIEW_CENTER_Y - BAR_BASE_HEIGHT / 2}
						width={BAR_WIDTH}
						height={BAR_BASE_HEIGHT}
						rx={4}
						fill={`url(#${gradientId})`}
						style={
							{
								"--bar-amp": String(peak),
								animationDelay: `${index * 45}ms`,
							} as CSSProperties
						}
					/>
				);
			})}
		</svg>
	);
}
