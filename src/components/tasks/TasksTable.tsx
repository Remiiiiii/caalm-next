"use client";

import { format, isPast, parseISO } from "date-fns";
import { Calendar, Link2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Task, TaskStatus } from "@/types/tasks";

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
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Priority</TableHead>
						<TableHead>Assignee</TableHead>
						<TableHead>Due date</TableHead>
						<TableHead>Linked</TableHead>
						<TableHead className="w-[80px]">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{tasks.map((task) => {
						const overdue =
							task.dueDate &&
							task.status !== "done" &&
							isPast(parseISO(task.dueDate));
						return (
							<TableRow
								key={task.$id}
								className="hover:bg-blue-50 transition-all duration-200"
							>
								<TableCell>
									<div className="font-medium text-slate-900">{task.title}</div>
									{task.description ? (
										<p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
											{task.description}
										</p>
									) : null}
								</TableCell>
								<TableCell>
									{canEdit ? (
										<Select
											value={task.status}
											onValueChange={(value) =>
												onStatusChange(task.$id, value as TaskStatus)
											}
										>
											<SelectTrigger className="w-[140px] h-8 bg-white">
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
								<TableCell>
									<span
										className={`text-sm font-medium capitalize ${PRIORITY_CLASS[task.priority] || ""}`}
									>
										{task.priority}
									</span>
								</TableCell>
								<TableCell className="text-sm text-slate-700">
									{task.assigneeId
										? assigneeNames[task.assigneeId] || "Assigned"
										: "Unassigned"}
								</TableCell>
								<TableCell>
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
								<TableCell>
									{task.linkedEntityType && task.linkedEntityType !== "none" ? (
										<span className="inline-flex items-center gap-1 text-xs text-slate-600 capitalize">
											<Link2 className="h-3 w-3" />
											{task.linkedEntityType.replace("_", " ")}
										</span>
									) : (
										<span className="text-sm text-slate-400">—</span>
									)}
								</TableCell>
								<TableCell>
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
			</Table>
		</div>
	);
}
