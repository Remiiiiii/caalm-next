"use client";

import { Ban, ClipboardList, Loader2 } from "lucide-react";
import { useState } from "react";
import EntityPreviewSheetShell from "@/components/preview/EntityPreviewSheetShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
	CreateTaskInput,
	TaskLinkedEntityType,
	TaskPriority,
} from "@/types/tasks";
import { CONTRACT_DEPARTMENTS } from "../../../constants";

interface TaskCreateSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (input: CreateTaskInput) => Promise<void>;
	assignees: Array<{ id: string; name: string }>;
	canAssign: boolean;
}

export function TaskCreateSheet({
	open,
	onOpenChange,
	onSubmit,
	assignees,
	canAssign,
}: TaskCreateSheetProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<TaskPriority>("medium");
	const [assigneeId, setAssigneeId] = useState<string>("");
	const [dueDate, setDueDate] = useState("");
	const [department, setDepartment] = useState("");
	const [linkedEntityType, setLinkedEntityType] =
		useState<TaskLinkedEntityType>("none");
	const [saving, setSaving] = useState(false);

	const reset = () => {
		setTitle("");
		setDescription("");
		setPriority("medium");
		setAssigneeId("");
		setDueDate("");
		setDepartment("");
		setLinkedEntityType("none");
	};

	const handleSubmit = async () => {
		if (!title.trim()) return;
		setSaving(true);
		try {
			await onSubmit({
				title: title.trim(),
				description: description.trim() || undefined,
				priority,
				assigneeId: canAssign && assigneeId ? assigneeId : undefined,
				dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
				department: department || undefined,
				linkedEntityType,
			});
			reset();
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<EntityPreviewSheetShell
			open={open}
			onOpenChange={onOpenChange}
			title="New task"
			description="Assign compliance work with a due date and optional linked record."
			icon={ClipboardList}
			footer={
				<div className="flex w-full items-center justify-between gap-3">
					<Button
						type="button"
						variant="outline"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						onClick={() => onOpenChange(false)}
					>
						<Ban className="h-4 w-4" />
						Cancel
					</Button>
					<Button
						type="button"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						disabled={!title.trim() || saving}
						onClick={handleSubmit}
					>
						{saving ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" />
								Saving…
							</>
						) : (
							"Create task"
						)}
					</Button>
				</div>
			}
		>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="task-title">Title</Label>
					<Input
						id="task-title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Renew DCF residential license"
						className="border-white/60 bg-white/80"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="task-description">Description</Label>
					<Textarea
						id="task-description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Notes, checklist, or context…"
						className="min-h-[80px] border-white/60 bg-white/80"
					/>
				</div>
				<div className="space-y-2">
					<Label>Priority</Label>
					<Select
						value={priority}
						onValueChange={(v) => setPriority(v as TaskPriority)}
					>
						<SelectTrigger className="border-white/60 bg-white/80">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="low">Low</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="high">High</SelectItem>
							<SelectItem value="urgent">Urgent</SelectItem>
						</SelectContent>
					</Select>
				</div>
				{canAssign ? (
					<div className="space-y-2">
						<Label>Assignee</Label>
						<Select
							value={assigneeId || "none"}
							onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)}
						>
							<SelectTrigger className="border-white/60 bg-white/80">
								<SelectValue placeholder="Unassigned" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Unassigned</SelectItem>
								{assignees.map((a) => (
									<SelectItem key={a.id} value={a.id}>
										{a.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				) : null}
				<div className="space-y-2">
					<Label htmlFor="task-due">Due date</Label>
					<Input
						id="task-due"
						type="date"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
						className="border-white/60 bg-white/80"
					/>
				</div>
				<div className="space-y-2">
					<Label>Department</Label>
					<Select value={department || undefined} onValueChange={setDepartment}>
						<SelectTrigger className="border-white/60 bg-white/80">
							<SelectValue placeholder="Select department" />
						</SelectTrigger>
						<SelectContent>
							{CONTRACT_DEPARTMENTS.map((dept) => (
								<SelectItem key={dept} value={dept}>
									{dept}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>Linked entity</Label>
					<Select
						value={linkedEntityType}
						onValueChange={(v) =>
							setLinkedEntityType(v as TaskLinkedEntityType)
						}
					>
						<SelectTrigger className="border-white/60 bg-white/80">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">None</SelectItem>
							<SelectItem value="contract">Contract</SelectItem>
							<SelectItem value="license">License</SelectItem>
							<SelectItem value="audit">Audit</SelectItem>
							<SelectItem value="calendar_event">Calendar event</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</EntityPreviewSheetShell>
	);
}
