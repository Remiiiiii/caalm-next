"use client";

import { GitBranch, KeyRound, Share2, Table, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type UserManagementViewType = "table" | "diagram";
export type GraphLineage = "reporting" | "assignment";

export const USER_MANAGEMENT_VIEW_STORAGE_KEY =
	"user-management-view-preference";

type SegmentTab<T extends string> = {
	value: T;
	label: string;
	icon: LucideIcon;
	ariaLabel?: string;
};

function SegmentedToggle<T extends string>({
	value,
	onChange,
	tabs,
	ariaLabel,
}: {
	value: T;
	onChange: (value: T) => void;
	tabs: Array<SegmentTab<T>>;
	ariaLabel: string;
}) {
	return (
		<div
			role="tablist"
			aria-label={ariaLabel}
			className="relative inline-grid grid-cols-2 items-center rounded-full border border-slate-200 bg-slate-100 p-1"
		>
			<span
				aria-hidden
				className={cn(
					"pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-white shadow-sm",
					"transition-transform duration-200 ease-out",
					tabs[1] && value === tabs[1].value
						? "translate-x-full"
						: "translate-x-0",
				)}
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

const VIEW_TABS: Array<SegmentTab<UserManagementViewType>> = [
	{ value: "table", label: "Table", icon: Table, ariaLabel: "Table view" },
	{ value: "diagram", label: "Diagram", icon: Share2, ariaLabel: "Diagram view" },
];

const LINEAGE_TABS: Array<SegmentTab<GraphLineage>> = [
	{ value: "reporting", label: "Reporting", icon: GitBranch },
	{ value: "assignment", label: "Access grant", icon: KeyRound },
];

/** Segmented Table / Diagram switch — white raised pill on a slate track. */
export function UserManagementViewToggle({
	view,
	onViewChange,
}: {
	view: UserManagementViewType;
	onViewChange: (view: UserManagementViewType) => void;
}) {
	return (
		<SegmentedToggle
			value={view}
			onChange={onViewChange}
			tabs={VIEW_TABS}
			ariaLabel="User management views"
		/>
	);
}

/** Same pill style as Table / Diagram, for reporting vs access-grant lines. */
export function UserManagementLineageToggle({
	lineage,
	onLineageChange,
}: {
	lineage: GraphLineage;
	onLineageChange: (lineage: GraphLineage) => void;
}) {
	return (
		<SegmentedToggle
			value={lineage}
			onChange={onLineageChange}
			tabs={LINEAGE_TABS}
			ariaLabel="Diagram lineage"
		/>
	);
}
