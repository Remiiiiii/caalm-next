"use client";

import { format, isPast, parseISO } from "date-fns";
import { Calendar, Link2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/tasks";

const rowPad = "px-3 py-3 align-middle";

const STATUS_LABELS: Record<TaskStatus, string> = {
	not_started: "Not started",
	in_progress: "In progress",
	blocked: "Blocked",
	done: "Done",
};

const STATUS_CLASS: Record<TaskStatus, string> = {
	not_started: "bg-slate-100 text-slate-700 border-slate-200",
	in_progress: "bg-blue/10 text-blue border-blue/20",
	blocked: "bg-orange/10 text-orange border-orange/20",
	done: "bg-green/10 text-green border-green/20",
};

const PRIORITY_CLASS: Record<string, string> = {
	low: "text-slate-600",
	medium: "text-blue",
	high: "text-orange",
	urgent: "text-red",
};

interface TasksTableProps {
	tasks: Task[];
	assigneeNames: Record<string, string>;
	onStatusChange: (taskId: string, status: TaskStatus) => void;
	onDelete: (taskId: string) => void;
	canEdit: boolean;
}

export function TasksTable({
	tasks,
	assigneeNames,
	onStatusChange,
	onDelete,
	canEdit,
}: TasksTableProps) {
	if (tasks.length === 0) {
		return (
			<div className="text-center py-12 px-4">
				<p className="text-slate-700 font-medium mb-1">No tasks found</p>
				<p className="text-sm text-slate-600">
					Update filters or create a new task to get started.
				</p>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-3 p-3 md:hidden">
				{tasks.map((task) => {
					const overdue =
						task.dueDate &&
						task.status !== "done" &&
						isPast(parseISO(task.dueDate));
					return (
						<Card key={task.$id} className="glass-card">
							<div className="glass-card-cap" />
							<CardContent className="p-4 space-y-3">
								<div>
									<p className="text-sm font-medium sidebar-gradient-text">
										{task.title}
									</p>
									{task.description ? (
										<p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
											{task.description}
										</p>
									) : null}
								</div>
								<div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
									<span
										className={`font-medium capitalize ${PRIORITY_CLASS[task.priority] || ""}`}
									>
										{task.priority}
									</span>
									<span>·</span>
									<span>
										{task.assigneeId
											? assigneeNames[task.assigneeId] || "Assigned"
											: "Unassigned"}
									</span>
									{task.dueDate ? (
										<>
											<span>·</span>
											<span
												className={`inline-flex items-center gap-1 ${
													overdue ? "text-red font-medium" : ""
												}`}
											>
												<Calendar className="h-3.5 w-3.5" />
												{format(parseISO(task.dueDate), "MMM d, yyyy")}
											</span>
										</>
									) : null}
									{task.linkedEntityType && task.linkedEntityType !== "none" ? (
										<>
											<span>·</span>
											<span className="inline-flex items-center gap-1 capitalize">
												<Link2 className="h-3 w-3" />
												{task.linkedEntityType.replace("_", " ")}
											</span>
										</>
									) : null}
								</div>
								<div className="flex flex-wrap items-center gap-2">
									{canEdit ? (
										<Select
											value={task.status}
											onValueChange={(value) =>
												onStatusChange(task.$id, value as TaskStatus)
											}
										>
											<SelectTrigger className="h-10 w-full min-w-0 flex-1 border-[0.25px] border-slate-300 bg-white">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{(Object.keys(STATUS_LABELS) as TaskStatus[]).map(
													(s) => (
														<SelectItem key={s} value={s}>
															{STATUS_LABELS[s]}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									) : (
										<Badge
											variant="outline"
											className={STATUS_CLASS[task.status]}
										>
											{STATUS_LABELS[task.status]}
										</Badge>
									)}
									{canEdit ? (
										<Button
											type="button"
											variant="ghost"
											className="h-10 w-10 shrink-0 cursor-pointer text-slate-500 hover:text-red"
											aria-label={`Delete ${task.title}`}
											onClick={() => onDelete(task.$id)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									) : null}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			<CaalmDataTable className="hidden md:block">
				<TableHeader className="[&_tr]:border-b-0">
					<TableRow className={DATA_TABLE_HEADER_ROW}>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-3")}>
							Name
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Status
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Priority
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Assignee
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Due date
						</TableHead>
						<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
							Linked
						</TableHead>
						<TableHead
							className={cn(DATA_TABLE_HEADER_CELL, "w-[80px] pl-3 pr-4")}
						>
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="[&_tr:last-child>td]:border-b-0">
					{tasks.map((task) => {
						const overdue =
							task.dueDate &&
							task.status !== "done" &&
							isPast(parseISO(task.dueDate));
						return (
							<TableRow key={task.$id} className={DATA_TABLE_BODY_ROW_BASE}>
								<TableCell className={cn(rowPad, "pl-4 pr-3")}>
									<div className="font-medium text-slate-700">{task.title}</div>
									{task.description ? (
										<p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
											{task.description}
										</p>
									) : null}
								</TableCell>
								<TableCell className={rowPad}>
									{canEdit ? (
										<Select
											value={task.status}
											onValueChange={(value) =>
												onStatusChange(task.$id, value as TaskStatus)
											}
										>
											<SelectTrigger className="w-[140px] h-8 border-[0.25px] border-slate-300 bg-white">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{(Object.keys(STATUS_LABELS) as TaskStatus[]).map(
													(s) => (
														<SelectItem key={s} value={s}>
															{STATUS_LABELS[s]}
														</SelectItem>
													),
												)}
											</SelectContent>
										</Select>
									) : (
										<Badge
											variant="outline"
											className={STATUS_CLASS[task.status]}
										>
											{STATUS_LABELS[task.status]}
										</Badge>
									)}
								</TableCell>
								<TableCell className={rowPad}>
									<span
										className={`text-sm font-medium capitalize ${PRIORITY_CLASS[task.priority] || ""}`}
									>
										{task.priority}
									</span>
								</TableCell>
								<TableCell className={cn(rowPad, "text-sm text-slate-700")}>
									{task.assigneeId
										? assigneeNames[task.assigneeId] || "Assigned"
										: "Unassigned"}
								</TableCell>
								<TableCell className={rowPad}>
									{task.dueDate ? (
										<span
											className={`inline-flex items-center gap-1 text-sm ${
												overdue ? "text-red font-medium" : "text-slate-600"
											}`}
										>
											<Calendar className="h-3.5 w-3.5" />
											{format(parseISO(task.dueDate), "MMM d, yyyy")}
										</span>
									) : (
										<span className="text-sm text-slate-400">None</span>
									)}
								</TableCell>
								<TableCell className={rowPad}>
									{task.linkedEntityType && task.linkedEntityType !== "none" ? (
										<span className="inline-flex items-center gap-1 text-xs text-slate-600 capitalize">
											<Link2 className="h-3 w-3" />
											{task.linkedEntityType.replace("_", " ")}
										</span>
									) : (
										<span className="text-sm text-slate-400">—</span>
									)}
								</TableCell>
								<TableCell className={cn(rowPad, "pl-3 pr-4")}>
									{canEdit ? (
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 cursor-pointer text-slate-500 hover:text-red"
											aria-label={`Delete ${task.title}`}
											onClick={() => onDelete(task.$id)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									) : null}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</CaalmDataTable>
		</>
	);
}
