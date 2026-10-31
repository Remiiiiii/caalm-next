"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentedToggleTab<T extends string = string> = {
	value: T;
	label: string;
	icon?: LucideIcon;
	iconClassName?: string;
	hideLabel?: boolean;
	ariaLabel?: string;
	count?: number;
	/** Optional color for the count (e.g. amber for unassigned, red for overdue) */
	countClassName?: string;
	disabled?: boolean;
	/** Small mark after the label, e.g. a done check or an error count. */
	suffix?: ReactNode;
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
			className={cn("segmented-toggle", className)}
			style={{
				display: "grid",
				gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))`,
			}}
		>
			<span
				aria-hidden
				className="segmented-toggle-thumb"
				style={{
					top: "var(--segmented-toggle-pad)",
					bottom: "var(--segmented-toggle-pad)",
					left: "var(--segmented-toggle-pad)",
					width: `calc((100% - 2 * var(--segmented-toggle-pad)) / ${tabCount})`,
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
						disabled={tab.disabled}
						onClick={() => onChange(tab.value)}
						className={cn(
							"segmented-toggle-item",
							tab.hideLabel ? "px-2.5" : "px-3",
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
						{tab.suffix}
						{typeof tab.count === "number" ? (
							<span
								className={cn(
									"tabular-nums",
									tab.countClassName || "text-slate-500",
								)}
							>
								{tab.count}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
