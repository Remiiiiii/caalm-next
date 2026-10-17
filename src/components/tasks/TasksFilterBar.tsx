"use client";

import { Calendar, CircleDot, Flag } from "lucide-react";
import { SearchField } from "@/components/ui/search-field";
import type { TaskDueBucket, TaskPriority, TaskStatus } from "@/types/tasks";
import { TaskAssigneeFilter } from "./TaskAssigneeFilter";
import { TaskPillSelect } from "./TaskPillSelect";
import type { TaskPerson } from "./task-ui";

export interface TaskListFilters {
	search: string;
	status: TaskStatus | "all";
	priority: TaskPriority | "all";
	assigneeId: string;
	dueBucket: TaskDueBucket;
}

const STATUS_OPTIONS: Array<{ value: TaskListFilters["status"]; label: string }> =
	[
		{ value: "all", label: "All statuses" },
		{ value: "not_started", label: "Not started" },
		{ value: "in_progress", label: "In progress" },
		{ value: "blocked", label: "Blocked" },
		{ value: "done", label: "Done" },
	];

const PRIORITY_OPTIONS: Array<{
	value: TaskListFilters["priority"];
	label: string;
}> = [
	{ value: "all", label: "All priorities" },
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
];

const DUE_OPTIONS: Array<{ value: TaskDueBucket; label: string }> = [
	{ value: "any", label: "Any due date" },
	{ value: "overdue", label: "Overdue" },
	{ value: "next_7", label: "Next 7 days" },
	{ value: "none", label: "No due date" },
];

export function TasksFilterBar({
	filters,
	onChange,
	people,
}: {
	filters: TaskListFilters;
	onChange: (next: TaskListFilters) => void;
	people: TaskPerson[];
}) {
	return (
		<div className="flex flex-wrap items-center gap-2 border-b border-slate-200/60 px-4 py-3">
			<SearchField
				aria-label="Search tasks"
				placeholder="Search title, description, or ID…"
				value={filters.search}
				onChange={(e) => onChange({ ...filters, search: e.target.value })}
				containerClassName="h-9 w-full md:max-w-xs"
			/>
			<TaskPillSelect
				value={filters.status}
				options={STATUS_OPTIONS}
				ariaLabel="Filter by status"
				icon={CircleDot}
				onChange={(status) => onChange({ ...filters, status })}
			/>
			<TaskPillSelect
				value={filters.priority}
				options={PRIORITY_OPTIONS}
				ariaLabel="Filter by priority"
				icon={Flag}
				onChange={(priority) => onChange({ ...filters, priority })}
			/>
			<TaskAssigneeFilter
				value={filters.assigneeId}
				people={people}
				onChange={(assigneeId) => onChange({ ...filters, assigneeId })}
			/>
			<TaskPillSelect
				value={filters.dueBucket}
				options={DUE_OPTIONS}
				ariaLabel="Filter by due date"
				icon={Calendar}
				onChange={(dueBucket) => onChange({ ...filters, dueBucket })}
			/>
		</div>
	);
}
