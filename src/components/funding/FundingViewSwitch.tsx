"use client";

import { ListChecks, Shield, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type FundingView = "retention" | "pursuits" | "queue";

const TABS: Array<{
	value: FundingView;
	label: string;
	icon: typeof Shield;
}> = [
	{ value: "retention", label: "Retention", icon: Shield },
	{ value: "pursuits", label: "Pursuits", icon: Target },
	{ value: "queue", label: "Obligation queue", icon: ListChecks },
];

function thumbOffset(value: FundingView): string {
	if (value === "pursuits") return "translate-x-full";
	if (value === "queue") return "translate-x-[200%]";
	return "translate-x-0";
}

/** Segmented Retention / Pursuits / Queue switch — white thumb on slate track. */
export function FundingViewSwitch({
	value,
	onChange,
	className,
}: {
	value: FundingView;
	onChange: (value: FundingView) => void;
	className?: string;
}) {
	return (
		<div
			role="tablist"
			aria-label="Funding views"
			className={cn(
				"relative inline-grid grid-cols-3 items-center rounded-full border border-slate-200 bg-slate-100 p-1",
				className,
			)}
		>
			<span
				aria-hidden
				className={cn(
					"pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-white shadow-sm",
					"transition-transform duration-200 ease-out",
					thumbOffset(value),
				)}
			/>
			{TABS.map((tab) => {
				const selected = value === tab.value;
				const Icon = tab.icon;
				return (
					<button
						key={tab.value}
						type="button"
						role="tab"
						aria-selected={selected}
						onClick={() => onChange(tab.value)}
						className={cn(
							"relative z-10 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
							selected
								? "text-[#0f5384]"
								: "text-slate-500 hover:text-slate-700",
						)}
					>
						<Icon className="h-4 w-4" aria-hidden />
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}
