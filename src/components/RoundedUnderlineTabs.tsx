"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type RoundedUnderlineTab = {
	value: string;
	label: string;
	count?: number;
	icon?: LucideIcon;
};

export interface RoundedUnderlineTabsProps {
	tabs: RoundedUnderlineTab[];
	value: string;
	onValueChange: (value: string) => void;
	/** `bar` = one rounded row. `chips` = separate rounded pills. */
	variant?: "bar" | "chips";
	"aria-label"?: string;
	className?: string;
	listClassName?: string;
}

const tabButtonClassName = {
	bar: "tabs-underline tabs-underline-outside flex-1 rounded-sm data-[state=active]:bg-white/30 data-[state=active]:text-navy data-[state=active]:shadow-none",
	chips:
		"tabs-underline tabs-underline-outside rounded-md border border-white/40 bg-white/20 px-3 py-1.5 backdrop-blur hover:bg-white/30 data-[state=active]:bg-white/30",
} as const;

/**
 * Rounded tab row with the teal underline drawn under the rounded box,
 * not on its inner edge. Used on /my-contracts and /contracts.
 */
export default function RoundedUnderlineTabs({
	tabs,
	value,
	onValueChange,
	variant = "bar",
	"aria-label": ariaLabel = "Filter",
	className,
	listClassName,
}: RoundedUnderlineTabsProps) {
	return (
		<nav className={cn("overflow-visible pb-3", className)} aria-label={ariaLabel}>
			<div
				role="tablist"
				className={cn(
					variant === "bar"
						? "flex h-auto min-h-10 w-full overflow-visible rounded-md border border-white/40 bg-white/20 p-1 backdrop-blur"
						: "flex flex-wrap gap-2",
					listClassName,
				)}
			>
				{tabs.map((tab) => {
					const selected = value === tab.value;
					return (
						<button
							key={tab.value}
							type="button"
							role="tab"
							aria-selected={selected}
							data-state={selected ? "active" : undefined}
							tabIndex={selected ? 0 : -1}
							onClick={() => onValueChange(tab.value)}
							className={cn(
								"inline-flex cursor-pointer items-center justify-center gap-1.5 px-2 py-1.5 text-sm font-medium text-slate-700 shadow-none transition-colors duration-200",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								tabButtonClassName[variant],
							)}
						>
							{tab.icon ? (
								<tab.icon
									className={cn(
										"h-4 w-4 shrink-0",
										selected ? "text-[#0f5384]" : "text-slate-500",
									)}
									aria-hidden
								/>
							) : null}
							<span
								className={cn("font-medium", selected && "sidebar-gradient-text")}
							>
								{tab.label}
							</span>
							{typeof tab.count === "number" ? (
								<span className="tabular-nums text-slate-500">{tab.count}</span>
							) : null}
						</button>
					);
				})}
			</div>
		</nav>
	);
}
