"use client";

import { Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { TaskPriority, TaskStatus } from "@/types/tasks";

export interface TaskListFilters {
	search: string;
	status: TaskStatus | "all";
	priority: TaskPriority | "all";
	assigneeId: string;
}

interface TasksControlBarProps {
	filters: TaskListFilters;
	onChange: (next: TaskListFilters) => void;
	assignees: Array<{ id: string; name: string }>;
}

export function TasksControlBar({
	filters,
	onChange,
	assignees,
}: TasksControlBarProps) {
	return (
		<div className="flex flex-wrap items-center gap-3 p-4 sm:p-6 border-b border-slate-200">
			<div className="flex items-center gap-2 text-slate-600">
				<Filter className="h-4 w-4" />
				<span className="text-sm font-medium">Filters</span>
			</div>
			<Input
				aria-label="Search tasks"
				placeholder="Search by title…"
				value={filters.search}
				onChange={(e) => onChange({ ...filters, search: e.target.value })}
				className="max-w-xs bg-white"
			/>
			<Select
				value={filters.status}
				onValueChange={(value) =>
					onChange({ ...filters, status: value as TaskListFilters["status"] })
				}
			>
				<SelectTrigger
					className="w-[160px] bg-white"
					aria-label="Filter by status"
				>
					<SelectValue placeholder="Status" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All statuses</SelectItem>
					<SelectItem value="not_started">Not started</SelectItem>
					<SelectItem value="in_progress">In progress</SelectItem>
					<SelectItem value="blocked">Blocked</SelectItem>
					<SelectItem value="done">Done</SelectItem>
				</SelectContent>
			</Select>
			<Select
				value={filters.priority}
				onValueChange={(value) =>
					onChange({
						...filters,
						priority: value as TaskListFilters["priority"],
					})
				}
			>
				<SelectTrigger
					className="w-[150px] bg-white"
					aria-label="Filter by priority"
				>
					<SelectValue placeholder="Priority" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All priorities</SelectItem>
					<SelectItem value="low">Low</SelectItem>
					<SelectItem value="medium">Medium</SelectItem>
					<SelectItem value="high">High</SelectItem>
					<SelectItem value="urgent">Urgent</SelectItem>
				</SelectContent>
			</Select>
			<Select
				value={filters.assigneeId || "all"}
				onValueChange={(value) =>
					onChange({
						...filters,
						assigneeId: value === "all" ? "" : value,
					})
				}
			>
				<SelectTrigger
					className="w-[180px] bg-white"
					aria-label="Filter by assignee"
				>
					<SelectValue placeholder="Assignee" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All assignees</SelectItem>
					{assignees.map((a) => (
						<SelectItem key={a.id} value={a.id}>
							{a.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
