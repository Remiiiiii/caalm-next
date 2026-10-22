"use client";

import { useInViewReady } from "@/components/ui/metric-stat-card";
import { cn } from "@/lib/utils";

/** Rounded track with segments that grow in once on screen (same motion as MetricSegmentBar). */
export function AnimatedBar({
	segments,
	className,
	label,
}: {
	segments: Array<{ pct: number; className: string }>;
	className?: string;
	label?: string;
}) {
	const { ref, ready } = useInViewReady(
		segments.map((s) => s.pct.toFixed(1)).join("|"),
	);
	return (
		<div
			ref={ref}
			{...(label
				? { role: "img", "aria-label": label }
				: { "aria-hidden": true })}
			className={cn(
				"flex h-2 w-full overflow-hidden rounded-full bg-slate-200",
				className,
			)}
		>
			{segments.map((s) => (
				<div
					key={s.className}
					className={cn(
						"h-full transition-[width] duration-[1200ms] ease-out",
						s.className,
					)}
					style={{
						width: ready ? `${Math.max(0, Math.min(100, s.pct))}%` : "0%",
					}}
				/>
			))}
		</div>
	);
}
