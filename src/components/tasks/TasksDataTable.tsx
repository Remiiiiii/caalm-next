"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
	SortableDataTableHead,
} from "@/components/ui/caalm-data-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { TaskListItem, TaskPriority, TaskStatus } from "@/types/tasks";
import { cn } from "@/lib/utils";
import { TaskAssigneePicker } from "./TaskAssigneePicker";
import { TaskDueCell } from "./TaskDueCell";
import { TaskLinkedChip } from "./TaskLinkedChip";
import { TaskPriorityBars } from "./TaskPriorityBars";
import { TaskRowActions } from "./TaskRowActions";
import { TaskStatusMenu } from "./TaskStatusMenu";
import type { TaskPerson } from "./task-ui";
import { TASK_PRIORITY_FILLED } from "./task-ui";

type SortKey = "title" | "priority" | "dueDate";
type SortDir = "asc" | "desc";

const rowPad = "px-3 py-3 align-middle";

export function TasksDataTable({
	tasks,
	people,
	selectedIds,
	timeZone,
	canEdit,
	canAssign,
	onToggle,
	onToggleAll,
	onOpen,
	onStatusChange,
	onPriorityChange,
	onAssigneeChange,
	onDueChange,
	onDuplicate,
	onDelete,
}: {
	tasks: TaskListItem[];
	people: TaskPerson[];
	selectedIds: Set<string>;
	timeZone: string;
	canEdit: boolean;
	canAssign: boolean;
	onToggle: (id: string, checked: boolean) => void;
	onToggleAll: (checked: boolean) => void;
	onOpen: (task: TaskListItem) => void;
	onStatusChange: (id: string, status: TaskStatus) => void;
	onPriorityChange: (id: string, priority: TaskPriority) => void;
	onAssigneeChange: (id: string, assigneeId: string | null) => void;
	onDueChange: (id: string, dueDate: string) => void;
	onDuplicate: (task: TaskListItem) => void;
	onDelete: (id: string) => void;
}) {
	const [sortKey, setSortKey] = useState<SortKey>("title");
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	const toggleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	};

	const sorted = useMemo(() => {
		const list = [...tasks];
		const dir = sortDir === "asc" ? 1 : -1;
		list.sort((a, b) => {
			switch (sortKey) {
				case "title":
					return a.title.localeCompare(b.title) * dir;
				case "priority": {
					const pa = TASK_PRIORITY_FILLED[a.priority] ?? 0;
					const pb = TASK_PRIORITY_FILLED[b.priority] ?? 0;
					return (pa - pb) * dir;
				}
				case "dueDate": {
					const da = a.dueDate ? Date.parse(a.dueDate) : Number.POSITIVE_INFINITY;
					const db = b.dueDate ? Date.parse(b.dueDate) : Number.POSITIVE_INFINITY;
					return (da - db) * dir;
				}
				default: {
					const _exhaustive: never = sortKey;
					return _exhaustive;
				}
			}
		});
		return list;
	}, [tasks, sortKey, sortDir]);

	const allSelected =
		sorted.length > 0 && sorted.every((t) => selectedIds.has(t.$id));
	const someSelected =
		sorted.some((t) => selectedIds.has(t.$id)) && !allSelected;

	if (tasks.length === 0) {
		return (
			<div className="px-4 py-12 text-center">
				<p className="font-medium text-slate-700">No tasks found</p>
				<p className="mt-1 text-sm text-slate-500">
					Update filters or create a new task.
				</p>
			</div>
		);
	}

	return (
		<CaalmDataTable className="pt-2">
			<TableHeader className="[&_tr]:border-b-0">
				<TableRow className={DATA_TABLE_HEADER_ROW}>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "w-10 pl-4 pr-2")}>
						<Checkbox
							checked={
								allSelected ? true : someSelected ? "indeterminate" : false
							}
							onCheckedChange={(checked) => onToggleAll(checked === true)}
							aria-label="Select all tasks"
							className="cursor-pointer"
						/>
					</TableHead>
					<SortableDataTableHead
						label="Task"
						active={sortKey === "title"}
						onClick={() => toggleSort("title")}
					/>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Status
					</TableHead>
					<SortableDataTableHead
						label="Priority"
						active={sortKey === "priority"}
						onClick={() => toggleSort("priority")}
					/>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Assignee
					</TableHead>
					<SortableDataTableHead
						label="Due"
						active={sortKey === "dueDate"}
						onClick={() => toggleSort("dueDate")}
					/>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Linked
					</TableHead>
					<TableHead
						className={cn(DATA_TABLE_HEADER_CELL, "w-10 pl-3 pr-4 text-right")}
					/>
				</TableRow>
			</TableHeader>
			<TableBody className="[&_tr:last-child>td]:border-b-0">
				{sorted.map((task) => (
					<TableRow
						key={task.$id}
						className={cn(
							DATA_TABLE_BODY_ROW_CLICKABLE,
							"group bg-transparent",
							selectedIds.has(task.$id) &&
								"bg-blue/10 hover:bg-blue/10 shadow-none [&>td:first-child]:relative [&>td:first-child]:before:absolute [&>td:first-child]:before:inset-y-0 [&>td:first-child]:before:left-0 [&>td:first-child]:before:w-0.5 [&>td:first-child]:before:bg-[#0f5384]",
						)}
						onClick={() => onOpen(task)}
					>
						<TableCell
							className={cn(rowPad, "pl-4 pr-2")}
							onClick={(e) => e.stopPropagation()}
						>
							<Checkbox
								checked={selectedIds.has(task.$id)}
								onCheckedChange={(checked) =>
									onToggle(task.$id, checked === true)
								}
								aria-label={`Select ${task.title}`}
								className="cursor-pointer"
							/>
						</TableCell>
						<TableCell className={rowPad}>
							<div className="min-w-[14rem] max-w-md">
								<div className="flex items-center gap-1.5">
									<p className="truncate text-sm font-medium text-slate-700">
										{task.title}
									</p>
									{task.createdViaAssistant ? (
										<span
											className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#0f5384]"
											title={
												task.requestedByName
													? `Requested by ${task.requestedByName}`
													: "Created by assistant"
											}
										>
											<Sparkles className="h-3 w-3" />
											Assistant
										</span>
									) : null}
								</div>
								{task.description ? (
									<p className="truncate text-xs text-slate-500">
										{task.description}
									</p>
								) : null}
								<p className="mt-0.5 text-[11px] tabular-nums text-slate-400">
									{task.displayId}
								</p>
							</div>
						</TableCell>
						<TableCell
							className={cn(rowPad, "whitespace-nowrap")}
							onClick={(e) => e.stopPropagation()}
						>
							<TaskStatusMenu
								value={task.status}
								disabled={!canEdit}
								onChange={(status) => onStatusChange(task.$id, status)}
							/>
						</TableCell>
						<TableCell
							className={rowPad}
							onClick={(e) => e.stopPropagation()}
						>
							<TaskPriorityBars
								value={task.priority}
								disabled={!canEdit}
								onChange={
									canEdit
										? (priority) => onPriorityChange(task.$id, priority)
										: undefined
								}
							/>
						</TableCell>
						<TableCell
							className={rowPad}
							onClick={(e) => e.stopPropagation()}
						>
							<TaskAssigneePicker
								assigneeId={task.assigneeId}
								assigneeName={task.assigneeName}
								people={people}
								disabled={!canAssign}
								showName={false}
								onChange={
									canAssign
										? (id) => onAssigneeChange(task.$id, id)
										: undefined
								}
							/>
						</TableCell>
						<TableCell
							className={cn(rowPad, "whitespace-nowrap")}
							onClick={(e) => e.stopPropagation()}
						>
							<TaskDueCell
								dueDate={task.dueDate}
								status={task.status}
								timeZone={timeZone}
								disabled={!canEdit}
								onChange={
									canEdit ? (iso) => onDueChange(task.$id, iso) : undefined
								}
							/>
						</TableCell>
						<TableCell className={rowPad}>
							<TaskLinkedChip
								title={task.linkedEntityTitle}
								linkedEntityType={task.linkedEntityType}
							/>
						</TableCell>
						<TableCell
							className={cn(rowPad, "pl-3 pr-4 text-right")}
							onClick={(e) => e.stopPropagation()}
						>
							<TaskRowActions
								canEdit={canEdit}
								onOpen={() => onOpen(task)}
								onDuplicate={() => onDuplicate(task)}
								onDelete={() => onDelete(task.$id)}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</CaalmDataTable>
	);
}
