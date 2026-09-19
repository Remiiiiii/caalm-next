"use client";

import {
	GitBranch,
	KeyRound,
	type LucideIcon,
	Network,
	Share2,
	Table,
} from "lucide-react";
import {
	GRAPH_ORIENTATION_STORAGE_KEY,
	type GraphOrientation,
} from "@/lib/users/graph-orientation";
import { cn } from "@/lib/utils";

export type UserManagementViewType = "table" | "diagram";
export type GraphLineage = "reporting" | "assignment";
export type { GraphOrientation };
export { GRAPH_ORIENTATION_STORAGE_KEY };

export const USER_MANAGEMENT_VIEW_STORAGE_KEY =
	"user-management-view-preference";

type SegmentTab<T extends string> = {
	value: T;
	label: string;
	icon: LucideIcon;
	iconClassName?: string;
	hideLabel?: boolean;
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
							"relative z-10 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full py-1.5 text-sm font-medium transition-colors duration-200",
							tab.hideLabel ? "px-2.5" : "px-4",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
							selected
								? "text-[#0f5384]"
								: "text-slate-500 hover:text-slate-700",
						)}
					>
						<Icon
							className={cn("h-4 w-4", tab.iconClassName)}
							aria-hidden
						/>
						{tab.hideLabel ? null : tab.label}
					</button>
				);
			})}
		</div>
	);
}

const VIEW_TABS: Array<SegmentTab<UserManagementViewType>> = [
	{ value: "table", label: "Table", icon: Table, ariaLabel: "Table view" },
	{
		value: "diagram",
		label: "Diagram",
		icon: Share2,
		ariaLabel: "Diagram view",
	},
];

const LINEAGE_TABS: Array<SegmentTab<GraphLineage>> = [
	{
		value: "reporting",
		label: "Reporting",
		icon: GitBranch,
		ariaLabel: "Reporting",
	},
	{
		value: "assignment",
		label: "Access grant",
		icon: KeyRound,
		ariaLabel: "Access grant",
	},
];

const ORIENTATION_TABS: Array<SegmentTab<GraphOrientation>> = [
	{
		value: "ltr",
		label: "Side",
		icon: Network,
		iconClassName: "[transform:scaleX(-1)_rotate(90deg)]",
		hideLabel: true,
		ariaLabel: "Left to right layout",
	},
	{
		value: "tb",
		label: "Top-down",
		icon: Network,
		hideLabel: true,
		ariaLabel: "Top-down layout",
	},
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

/** Compact Side / Top-down switch for the diagram canvas. */
export function UserManagementOrientationToggle({
	orientation,
	onOrientationChange,
}: {
	orientation: GraphOrientation;
	onOrientationChange: (orientation: GraphOrientation) => void;
}) {
	return (
		<SegmentedToggle
			value={orientation}
			onChange={onOrientationChange}
			tabs={ORIENTATION_TABS}
			ariaLabel="Diagram orientation"
		/>
	);
}
