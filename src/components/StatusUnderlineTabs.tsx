"use client";

import { cn } from "@/lib/utils";

type UnderlineTab = {
	value: string;
	label: string;
	count: number;
};

interface StatusUnderlineTabsProps {
	tabs: UnderlineTab[];
	value: string;
	onValueChange: (value: string) => void;
	/** Kept for call-site compatibility; unused (CSS handles the underline). */
	indicatorId?: string;
	listClassName?: string;
}

/**
 * Status filter tabs using the same `.tabs-underline` animation as Sidebar /
 * AuditsSectionNav: teal bar grows to 80% width on hover/active via CSS.
 */
export default function StatusUnderlineTabs({
	tabs,
	value,
	onValueChange,
	listClassName,
}: StatusUnderlineTabsProps) {
	return (
		<nav
			className="mt-4 border-b border-slate-200/80 px-4 pt-1 sm:px-6"
			aria-label="Filter by status"
		>
			<div
				role="tablist"
				className={cn("grid w-full gap-1", listClassName)}
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
								"tabs-underline inline-flex cursor-pointer items-center justify-center gap-1.5 px-2 py-2.5 text-xs sm:text-sm",
								"rounded-none border-0 bg-transparent shadow-none",
								"font-medium text-slate-600 transition-colors duration-200",
								"hover:text-slate-700",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
								selected && "text-slate-700",
							)}
						>
							<span
								className={cn(
									"font-medium",
									selected && "sidebar-gradient-text",
								)}
							>
								{tab.label}
							</span>
							<span className="tabular-nums text-slate-500">{tab.count}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}

export type { UnderlineTab, StatusUnderlineTabsProps };
