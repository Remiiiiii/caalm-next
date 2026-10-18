"use client";

import { CircleDot, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types/tasks";
import { CaalmFilterSelect } from "@/components/ui/CaalmFilterSelect";
import { TaskAssigneeFilter } from "./TaskAssigneeFilter";
import {
	TASK_PRIORITY_LABELS,
	TASK_STATUS_LABELS,
	type TaskPerson,
} from "./task-ui";

type DockMenu = "assign" | "status" | "priority" | null;

const DOCK_KBD =
	"rounded border border-slate-300/80 bg-white/50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600";

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
	return <span className="mx-1 h-5 w-px shrink-0 bg-slate-300/70" aria-hidden />;
}

export function TasksBulkBar({
	count,
	canAssign,
	canEdit,
	people,
	/** Short list: sit under the card. Long list: sticky overlay with elevation. */
	placement = "sticky",
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
	placement?: "below-card" | "sticky";
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

	useEffect(() => {
		if (count === 0) {
			setOpenMenu(null);
			return;
		}
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				if (openMenu) {
					setOpenMenu(null);
					return;
				}
				onClear();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [count, onClear, openMenu]);

	if (count === 0) return null;

	const belowCard = placement === "below-card";

	return (
		<div
			className={cn(
				"flex justify-center px-4",
				belowCard
					? "relative mt-2"
					: // Long lists: keep bottom dock over the table while scrolling
						"pointer-events-none fixed inset-x-0 bottom-6 z-40",
			)}
			role="toolbar"
			aria-label="Bulk task actions"
		>
			{/* Same glass as the tasks card — pill shell, no glass-card-cap */}
			<div
				className={cn(
					"glass-card pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-full! px-3 py-2 text-slate-700",
					!belowCard && "shadow-lg shadow-slate-900/15",
				)}
			>
				<span className="inline-flex items-center gap-2 pr-1">
					<kbd
						className={cn(
							DOCK_KBD,
							"min-w-6 text-center font-poppins text-sm",
						)}
					>
						{count}
					</kbd>
					<span className="text-sm font-medium text-slate-700">selected</span>
				</span>

				<DockDivider />

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
						<DockDivider />
						<button
							type="button"
							onClick={onDelete}
							className="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-red hover:bg-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						>
							Delete
						</button>
					</>
				) : null}

				<DockDivider />

				<button
					type="button"
					onClick={onClear}
					className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					Clear
					<kbd className={DOCK_KBD}>Esc</kbd>
				</button>
			</div>
		</div>
	);
}
