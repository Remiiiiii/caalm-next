"use client";

import { cn } from "@/lib/utils";

type ProgressBarProps = {
	percent: number;
	label?: string;
	size?: "sm" | "md";
	className?: string;
};

/**
 * Read-only progress indicator. percent must be complete/total * 100.
 */
export function RoadmapProgressBar({
	percent,
	label,
	size = "md",
	className,
}: ProgressBarProps) {
	const clamped = Math.max(0, Math.min(100, Math.round(percent)));
	return (
		<div className={cn("w-full", className)}>
			<div className="flex items-center justify-between gap-3 mb-1.5">
				{label ? (
					<span className="text-sm font-medium text-slate-700">{label}</span>
				) : null}
				<span className="text-sm font-semibold text-slate-700 tabular-nums">
					{clamped}%
				</span>
			</div>
			<div
				className={cn(
					"w-full rounded-full bg-slate-200 overflow-hidden",
					size === "sm" ? "h-2" : "h-3",
				)}
				role="progressbar"
				aria-valuenow={clamped}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={label || "Roadmap progress"}
			>
				<div
					className="h-full rounded-full bg-[#0f5384] transition-all duration-200"
					style={{ width: `${clamped}%` }}
				/>
			</div>
		</div>
	);
}
