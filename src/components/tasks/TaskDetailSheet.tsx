"use client";

import { format } from "date-fns";
import { ClipboardList, Copy, Sparkles, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import EntityPreviewSheetShell from "@/components/preview/EntityPreviewSheetShell";
import { Button } from "@/components/ui/button";
import type { TaskListItem, TaskPriority, TaskStatus } from "@/types/tasks";
import { TaskAssigneePicker } from "./TaskAssigneePicker";
import { TaskDueCell } from "./TaskDueCell";
import { TaskLinkedChip } from "./TaskLinkedChip";
import { TaskPriorityBars } from "./TaskPriorityBars";
import { TaskStatusMenu } from "./TaskStatusMenu";
import type { TaskPerson } from "./task-ui";

function SheetRow({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-slate-200/70 py-3 last:border-b-0">
			<span className="shrink-0 text-xs font-medium text-slate-500">{label}</span>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

export function TaskDetailSheet({
	task,
	open,
	onOpenChange,
	people,
	timeZone,
	canEdit,
	canAssign,
	onStatusChange,
	onPriorityChange,
	onAssigneeChange,
	onDueChange,
	onDuplicate,
	onDelete,
}: {
	task: TaskListItem | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	people: TaskPerson[];
	timeZone: string;
	canEdit: boolean;
	canAssign: boolean;
	onStatusChange: (id: string, status: TaskStatus) => void;
	onPriorityChange: (id: string, priority: TaskPriority) => void;
	onAssigneeChange: (id: string, assigneeId: string | null) => void;
	onDueChange: (id: string, dueDate: string) => void;
	onDuplicate: (task: TaskListItem) => void;
	onDelete: (id: string) => void;
}) {
	if (!task) return null;

	return (
		<EntityPreviewSheetShell
			open={open}
			onOpenChange={onOpenChange}
			icon={ClipboardList}
			title={task.title}
			description={task.description || "No description"}
			footer={
				<div className="flex w-full items-center justify-end gap-3">
					{canEdit ? (
						<Button
							type="button"
							className="btn-primary cursor-pointer gap-1.5 px-3 sm:px-4"
							onClick={() => onDuplicate(task)}
						>
							<Copy className="h-4 w-4" />
							Duplicate
						</Button>
					) : null}
					{canEdit ? (
						<Button
							type="button"
							className="delete-btn cursor-pointer gap-1.5 px-3 sm:px-4"
							onClick={() => {
								onDelete(task.$id);
								onOpenChange(false);
							}}
						>
							<Trash2 className="h-4 w-4" />
							Delete
						</Button>
					) : null}
				</div>
			}
		>
			{task.createdViaAssistant ? (
				<p className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-[#0f5384]">
					<Sparkles className="h-3.5 w-3.5" />
					Assistant
					{task.requestedByName
						? ` · requested by ${task.requestedByName}`
						: null}
				</p>
			) : null}

			<div className="text-sm">
				<SheetRow label="Status">
					<TaskStatusMenu
						value={task.status}
						disabled={!canEdit}
						onChange={(status) => onStatusChange(task.$id, status)}
					/>
				</SheetRow>
				<SheetRow label="Priority">
					<TaskPriorityBars
						value={task.priority}
						disabled={!canEdit}
						onChange={
							canEdit
								? (priority) => onPriorityChange(task.$id, priority)
								: undefined
						}
					/>
				</SheetRow>
				<SheetRow label="Assignee">
					<TaskAssigneePicker
						assigneeId={task.assigneeId}
						assigneeName={task.assigneeName}
						people={people}
						disabled={!canAssign}
						showName
						onChange={
							canAssign
								? (id) => onAssigneeChange(task.$id, id)
								: undefined
						}
					/>
				</SheetRow>
				<SheetRow label="Due">
					<TaskDueCell
						dueDate={task.dueDate}
						status={task.status}
						timeZone={timeZone}
						disabled={!canEdit}
						onChange={canEdit ? (iso) => onDueChange(task.$id, iso) : undefined}
					/>
				</SheetRow>
				<SheetRow label="Linked">
					<TaskLinkedChip
						title={task.linkedEntityTitle}
						linkedEntityType={task.linkedEntityType}
					/>
				</SheetRow>
			</div>

			<div className="border-t border-slate-200/70 pt-3">
				<p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
					Activity
				</p>
				<ul className="space-y-2 text-xs text-slate-600">
					<li>
						Created {format(new Date(task.$createdAt), "MMM d · h:mm a")}
					</li>
					{task.assigneeName ? (
						<li>Assigned to {task.assigneeName}</li>
					) : (
						<li>Unassigned</li>
					)}
				</ul>
			</div>
		</EntityPreviewSheetShell>
	);
}
