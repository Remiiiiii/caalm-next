"use client";

import RoundedUnderlineTabs, {
	type RoundedUnderlineTab,
	type RoundedUnderlineTabsProps,
} from "@/components/RoundedUnderlineTabs";

type UnderlineTab = RoundedUnderlineTab & { count: number };

interface StatusUnderlineTabsProps {
	tabs: UnderlineTab[];
	value: string;
	onValueChange: (value: string) => void;
	/** Kept for call-site compatibility; unused (CSS handles the underline). */
	indicatorId?: string;
	listClassName?: string;
}

/**
 * Status filter tabs. Visual source of truth is RoundedUnderlineTabs
 * (rounded bar + teal underline outside the box).
 */
export default function StatusUnderlineTabs({
	tabs,
	value,
	onValueChange,
	listClassName,
}: StatusUnderlineTabsProps) {
	return (
		<RoundedUnderlineTabs
			tabs={tabs}
			value={value}
			onValueChange={onValueChange}
			variant="bar"
			aria-label="Filter by status"
			className="mt-4 px-4 sm:px-6"
			listClassName={listClassName}
		/>
	);
}

export type { StatusUnderlineTabsProps, UnderlineTab, RoundedUnderlineTabsProps };
