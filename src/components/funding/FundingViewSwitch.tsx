"use client";

import { Shield, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type FundingView = "retention" | "pursuits";

/** Segmented Retention / Pursuits switch — white thumb on slate track. */
export function FundingViewSwitch({
	value,
	onChange,
	className,
}: {
	value: FundingView;
	onChange: (value: FundingView) => void;
	className?: string;
}) {
	const isRetention = value === "retention";

	return (
		<div
			role="tablist"
			aria-label="Funding views"
			className={cn(
				"relative inline-grid grid-cols-2 items-center rounded-full border border-slate-200 bg-slate-100 p-1",
				className,
			)}
		>
			{/* Sliding white thumb behind the active label */}
			<span
				aria-hidden
				className={cn(
					"pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm",
					"transition-transform duration-200 ease-out",
					isRetention ? "translate-x-0" : "translate-x-full",
				)}
			/>
			<button
				type="button"
				role="tab"
				aria-selected={isRetention}
				onClick={() => onChange("retention")}
				className={cn(
					"relative z-10 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
					isRetention ? "text-slate-700" : "text-slate-500 hover:text-slate-700",
				)}
			>
				<Shield className="h-4 w-4 text-[#0f5384]" aria-hidden />
				Retention
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={!isRetention}
				onClick={() => onChange("pursuits")}
				className={cn(
					"relative z-10 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
					!isRetention
						? "text-slate-700"
						: "text-slate-500 hover:text-slate-700",
				)}
			>
				<Target className="h-4 w-4 text-[#0f5384]" aria-hidden />
				Pursuits
			</button>
		</div>
	);
}
