"use client";

import { Check } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskPriority } from "@/types/tasks";
import { cn } from "@/lib/utils";
import {
	TASK_PRIORITY_BAR,
	TASK_PRIORITY_FILLED,
	TASK_PRIORITY_LABELS,
} from "./task-ui";

const PRIORITIES = ["low", "medium", "high"] as const;

function Bars({ priority }: { priority: TaskPriority }) {
	const filled = TASK_PRIORITY_FILLED[priority];
	return (
		<span className="inline-flex items-end gap-0.5" aria-hidden>
			{[1, 2, 3].map((n) => (
				<span
					key={n}
					className={cn(
						"w-1 rounded-sm",
						n === 1 ? "h-2" : n === 2 ? "h-2.5" : "h-3",
						n <= filled ? TASK_PRIORITY_BAR[priority] : "bg-slate-200",
					)}
				/>
			))}
		</span>
	);
}

export function TaskPriorityBars({
	value,
	disabled,
	onChange,
}: {
	value: TaskPriority;
	disabled?: boolean;
	onChange?: (priority: TaskPriority) => void;
}) {
	const body = (
		<span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
			<Bars priority={value} />
			{TASK_PRIORITY_LABELS[value]}
		</span>
	);

	if (!onChange) return body;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={disabled}>
				<button
					type="button"
					onClick={(e) => e.stopPropagation()}
					className={cn(
						"cursor-pointer rounded-md px-1 py-0.5 hover:bg-slate-50",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						disabled && "cursor-not-allowed opacity-50",
					)}
				>
					{body}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-36" onClick={(e) => e.stopPropagation()}>
				{PRIORITIES.map((priority) => (
					<DropdownMenuItem
						key={priority}
						className="cursor-pointer gap-2"
						onSelect={() => onChange(priority)}
					>
						<Bars priority={priority} />
						<span className="flex-1">{TASK_PRIORITY_LABELS[priority]}</span>
						{priority === value ? <Check className="h-3.5 w-3.5" /> : null}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
