"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SegmentedToggleTab<T extends string = string> = {
	value: T;
	label: string;
	icon?: LucideIcon;
	iconClassName?: string;
	hideLabel?: boolean;
	ariaLabel?: string;
	count?: number;
};

export function SegmentedToggle<T extends string>({
	value,
	onChange,
	tabs,
	ariaLabel,
	className,
}: {
	value: T;
	onChange: (value: T) => void;
	tabs: Array<SegmentedToggleTab<T>>;
	ariaLabel: string;
	className?: string;
}) {
	const selectedIndex = Math.max(
		0,
		tabs.findIndex((tab) => tab.value === value),
	);
	const tabCount = Math.max(tabs.length, 1);

	return (
		<div
			role="tablist"
			aria-label={ariaLabel}
			className={cn(
				"relative inline-grid items-center rounded-full border border-slate-200 bg-slate-100 p-1",
				className,
			)}
			style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}
		>
			<span
				aria-hidden
				className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
				style={{
					width: `calc((100% - 0.5rem) / ${tabCount})`,
					transform: `translateX(${selectedIndex * 100}%)`,
				}}
			/>
			{tabs.map((tab) => {
				const selected = value === tab.value;
				const Icon = tab.icon;
				return (
					<button
						key={tab.value}
						type="button"
						role="tab"
						aria-label={tab.ariaLabel ?? tab.label}
						aria-selected={selected}
						onClick={() => onChange(tab.value)}
						className={cn(
							"relative z-10 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-medium transition-colors duration-200",
							tab.hideLabel ? "px-2.5" : "px-3",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
							selected
								? "text-[#0f5384]"
								: "text-slate-500 hover:text-slate-700",
						)}
					>
						{Icon ? (
							<Icon
								className={cn("h-4 w-4 shrink-0", tab.iconClassName)}
								aria-hidden
							/>
						) : null}
						{tab.hideLabel ? null : (
							<span className="truncate">{tab.label}</span>
						)}
						{typeof tab.count === "number" ? (
							<span className="tabular-nums text-slate-500">{tab.count}</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
