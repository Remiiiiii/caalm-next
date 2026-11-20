"use client";

import {
	SegmentedToggle,
	type SegmentedToggleTab,
} from "@/components/ui/segmented-toggle";
import { cn } from "@/lib/utils";

export type UnderlineTab = {
	value: string;
	label: string;
	count: number;
};

interface StatusUnderlineTabsProps {
	tabs: UnderlineTab[];
	value: string;
	onValueChange: (value: string) => void;
	/** Kept for call-site compatibility; unused. */
	indicatorId?: string;
	listClassName?: string;
}

/**
 * Status filter tabs for contracts / licenses / approvals.
 * Thin adapter over SegmentedToggle (counts supported).
 */
export default function StatusUnderlineTabs({
	tabs,
	value,
	onValueChange,
	listClassName,
}: StatusUnderlineTabsProps) {
	const segmentedTabs: Array<SegmentedToggleTab<string>> = tabs.map((tab) => ({
		value: tab.value,
		label: tab.label,
		count: tab.count,
	}));

	return (
		<div className={cn("mt-4 px-4 sm:px-6", listClassName)}>
			<SegmentedToggle
				value={value}
				onChange={onValueChange}
				tabs={segmentedTabs}
				ariaLabel="Filter by status"
				className="w-full max-w-full sm:w-auto"
			/>
		</div>
	);
}

export type { StatusUnderlineTabsProps };
