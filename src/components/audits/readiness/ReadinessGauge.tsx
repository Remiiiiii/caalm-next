import type { Rag, RagThresholds } from "./types";

const CX = 90;
const CY = 90;
const R = 70;
const ARC = `M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`;

/** Half-circle 0-100 gauge with red / amber / green bands taken from the thresholds. */
export function ReadinessGauge({
	score,
	rag,
	thresholds,
}: {
	score: number | null;
	rag: Rag | null;
	thresholds: RagThresholds;
}) {
	const { amber, green } = thresholds;
	const angle = Math.PI * (1 - Math.max(0, Math.min(100, score ?? 0)) / 100);
	const markerX = CX + R * Math.cos(angle);
	const markerY = CY - R * Math.sin(angle);

	return (
		<svg
			viewBox="0 0 180 112"
			width={200}
			role="img"
			aria-label={
				score === null
					? "Readiness score not available yet"
					: `Readiness score ${score} out of 100, status ${rag ?? "unknown"}`
			}
			className="block flex-none"
		>
			<path
				d={ARC}
				pathLength={100}
				fill="none"
				strokeWidth={14}
				className="stroke-red"
				strokeDasharray={`${amber} ${100 - amber}`}
			/>
			<path
				d={ARC}
				pathLength={100}
				fill="none"
				strokeWidth={14}
				className="stroke-orange"
				strokeDasharray={`0 ${amber} ${green - amber} ${100 - green}`}
			/>
			<path
				d={ARC}
				pathLength={100}
				fill="none"
				strokeWidth={14}
				className="stroke-green"
				strokeDasharray={`0 ${green} ${100 - green} 0`}
			/>
			{score === null ? null : (
				<circle
					cx={markerX}
					cy={markerY}
					r={7}
					fill="#fff"
					stroke="#0f5384"
					strokeWidth={3}
				/>
			)}
			<text
				x={CX}
				y={86}
				fontSize={38}
				fontWeight={700}
				textAnchor="middle"
				className="fill-slate-700"
			>
				{score ?? "N/A"}
			</text>
			<text
				x={CX}
				y={102}
				fontSize={11}
				textAnchor="middle"
				className="fill-slate-600"
			>
				out of 100
			</text>
			<text
				x={20}
				y={108}
				fontSize={10}
				textAnchor="middle"
				className="fill-slate-600"
			>
				0
			</text>
			<text
				x={160}
				y={108}
				fontSize={10}
				textAnchor="middle"
				className="fill-slate-600"
			>
				100
			</text>
		</svg>
	);
}
