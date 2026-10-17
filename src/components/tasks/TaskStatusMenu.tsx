"use client";

import { Check } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskStatus } from "@/types/tasks";
import { cn } from "@/lib/utils";
import {
	CAALM_BADGE_BASE,
	TASK_STATUS_BADGE,
	TASK_STATUS_LABELS,
} from "./task-ui";

const STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];

export function TaskStatusMenu({
	value,
	disabled,
	onChange,
}: {
	value: TaskStatus;
	disabled?: boolean;
	onChange: (status: TaskStatus) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={disabled}>
				<button
					type="button"
					onClick={(e) => e.stopPropagation()}
					className={cn(
						CAALM_BADGE_BASE,
						TASK_STATUS_BADGE[value],
						"cursor-pointer transition-all duration-200 hover:shadow-sm",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						disabled && "cursor-not-allowed opacity-50",
					)}
				>
					{TASK_STATUS_LABELS[value]}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="w-44"
				onClick={(e) => e.stopPropagation()}
			>
				{STATUSES.map((status) => (
					<DropdownMenuItem
						key={status}
						className="cursor-pointer gap-2"
						onSelect={() => onChange(status)}
					>
						<span
							className={cn(
								CAALM_BADGE_BASE,
								TASK_STATUS_BADGE[status],
								"pointer-events-none",
							)}
						>
							{TASK_STATUS_LABELS[status]}
						</span>
						{status === value ? (
							<Check className="ml-auto h-3.5 w-3.5 shrink-0" />
						) : null}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
