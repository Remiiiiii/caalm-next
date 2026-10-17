"use client";

import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type { TaskView, TaskViewCounts } from "@/types/tasks";

const TABS: Array<{
	id: TaskView;
	label: string;
	countKey: keyof TaskViewCounts;
}> = [
	{ id: "all", label: "All tasks", countKey: "all" },
	{ id: "mine", label: "My tasks", countKey: "mine" },
	{ id: "unassigned", label: "Unassigned", countKey: "unassigned" },
	{ id: "overdue", label: "Overdue", countKey: "overdue" },
	{ id: "due_this_week", label: "Due this week", countKey: "dueThisWeek" },
];

export function TasksViewTabs({
	value,
	counts,
	onChange,
}: {
	value: TaskView;
	counts: TaskViewCounts;
	onChange: (view: TaskView) => void;
}) {
	return (
		<div className="px-4 py-3">
			<SegmentedToggle
				value={value}
				onChange={onChange}
				ariaLabel="Task views"
				className="w-full max-w-3xl"
				tabs={TABS.map((tab) => {
					const count = counts[tab.countKey] ?? 0;
					const countClassName =
						tab.id === "unassigned" && count > 0
							? "text-orange"
							: tab.id === "overdue" && count > 0
								? "text-red"
								: undefined;
					return {
						value: tab.id,
						label: tab.label,
						count,
						countClassName,
					};
				})}
			/>
		</div>
	);
}
