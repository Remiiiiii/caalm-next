"use client";

import { CircleDot, Flag, Trash2 } from "lucide-react";
import { type RefObject, useState } from "react";
import {
	BulkActionDivider,
	BulkActionDock,
} from "@/components/ui/bulk-action-dock";
import { CaalmFilterSelect } from "@/components/ui/CaalmFilterSelect";
import type { TaskPriority, TaskStatus } from "@/types/tasks";
import { TaskAssigneeFilter } from "./TaskAssigneeFilter";
import {
	TASK_PRIORITY_LABELS,
	TASK_STATUS_LABELS,
	type TaskPerson,
} from "./task-ui";

type DockMenu = "assign" | "status" | "priority" | null;

const STATUS_OPTIONS = (Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map(
	(status) => ({
		value: status,
		label: TASK_STATUS_LABELS[status],
	}),
);

const PRIORITY_OPTIONS = (["low", "medium", "high"] as const).map(
	(priority) => ({
		value: priority as TaskPriority,
		label: TASK_PRIORITY_LABELS[priority],
	}),
);

function DockDivider() {
	return (
		<span className="mx-1 h-5 w-px shrink-0 bg-slate-300/70" aria-hidden />
	);
}

export function TasksBulkBar({
	count,
	canAssign,
	canEdit,
	people,
	anchorRef,
	onAssign,
	onStatus,
	onPriority,
	onDelete,
	onClear,
}: {
	count: number;
	canAssign: boolean;
	canEdit: boolean;
	people: TaskPerson[];
	/** Card the dock centers on. */
	anchorRef?: RefObject<HTMLElement | null>;
	onAssign: (assigneeId: string | null) => void;
	onStatus: (status: TaskStatus) => void;
	onPriority: (priority: TaskPriority) => void;
	onDelete: () => void;
	onClear: () => void;
}) {
	const [openMenu, setOpenMenu] = useState<DockMenu>(null);

	const setMenuOpen = (id: Exclude<DockMenu, null>, open: boolean) => {
		setOpenMenu((prev) => {
			if (open) return id;
			return prev === id ? null : prev;
		});
	};

	return (
		<BulkActionDock
			count={count}
			noun="task"
			anchorRef={anchorRef}
			onClear={onClear}
			escapeBlocked={openMenu !== null}
		>
			{canAssign ? (
				<TaskAssigneeFilter
					value=""
					people={people}
					mode="assign"
					variant="dock"
					triggerLabel="Assign to"
					ariaLabel="Assign selected tasks"
					open={openMenu === "assign"}
					onOpenChange={(open) => setMenuOpen("assign", open)}
					onChange={(id) => onAssign(id || null)}
				/>
			) : null}

			{canEdit ? (
				<CaalmFilterSelect
					value={STATUS_OPTIONS[0]?.value ?? "not_started"}
					options={STATUS_OPTIONS}
					triggerLabel="Set status"
					ariaLabel="Set status for selected tasks"
					variant="dock"
					icon={CircleDot}
					open={openMenu === "status"}
					onOpenChange={(open) => setMenuOpen("status", open)}
					onChange={(status) => onStatus(status)}
				/>
			) : null}

			{canEdit ? (
				<CaalmFilterSelect
					value={PRIORITY_OPTIONS[0]?.value ?? "medium"}
					options={PRIORITY_OPTIONS}
					triggerLabel="Priority"
					ariaLabel="Set priority for selected tasks"
					variant="dock"
					icon={Flag}
					open={openMenu === "priority"}
					onOpenChange={(open) => setMenuOpen("priority", open)}
					onChange={(priority) => onPriority(priority)}
				/>
			) : null}

			{canEdit ? (
				<>
					<BulkActionDivider />
					<button
						type="button"
						onClick={onDelete}
						className="delete-btn cursor-pointer text-sm"
					>
						<Trash2 className="h-4 w-4" aria-hidden />
						Delete
					</button>
				</>
			) : null}
		</BulkActionDock>
	);
}
