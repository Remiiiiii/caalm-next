"use client";

import {
	GitBranch,
	KeyRound,
	Network,
	Share2,
	Table,
} from "lucide-react";
import {
	GRAPH_ORIENTATION_STORAGE_KEY,
	type GraphOrientation,
} from "@/lib/users/graph-orientation";
import {
	SegmentedToggle,
	type SegmentedToggleTab,
} from "@/components/ui/segmented-toggle";

export type UserManagementViewType = "table" | "diagram";
export type GraphLineage = "reporting" | "assignment";
export type { GraphOrientation };
export { GRAPH_ORIENTATION_STORAGE_KEY };

export const USER_MANAGEMENT_VIEW_STORAGE_KEY =
	"user-management-view-preference";

const VIEW_TABS: Array<SegmentedToggleTab<UserManagementViewType>> = [
	{ value: "table", label: "Table", icon: Table, ariaLabel: "Table view" },
	{
		value: "diagram",
		label: "Diagram",
		icon: Share2,
		ariaLabel: "Diagram view",
	},
];

const LINEAGE_TABS: Array<SegmentedToggleTab<GraphLineage>> = [
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

const ORIENTATION_TABS: Array<SegmentedToggleTab<GraphOrientation>> = [
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
