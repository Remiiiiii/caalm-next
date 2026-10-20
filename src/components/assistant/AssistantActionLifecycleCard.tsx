"use client";

import {
	AlertTriangle,
	Calendar as CalendarIcon,
	Check,
	CheckCircle2,
	Clock3,
	Copy,
	ExternalLink,
	ListTodo,
	Loader2,
	RefreshCw,
	UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
	AssistantActionField,
	AssistantActionLifecycle,
	AssistantPendingAction,
} from "@/components/assistant/assistantTypes";
import { getAvatarColor } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CaalmDatePicker } from "@/components/ui/caalm-date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dueDateIsoOffset } from "@/lib/assistant/parseCreateTaskDraft";
import { cn, getProfilePictureUrl } from "@/lib/utils";

const BADGE_TONES = {
	green: "bg-green/10 text-green border-green/20",
	orange: "bg-orange/10 text-orange border-orange/20",
	red: "bg-red/10 text-red border-red/20",
	blue: "bg-blue/10 text-blue border-blue/20",
	slate: "bg-slate-100 text-slate-600 border-slate-200",
} as const;

type Priority = "low" | "medium" | "high";

function AssigneeFace({
	name,
	userId,
	avatar,
}: {
	name: string;
	userId?: string;
	avatar?: string | null;
}) {
	const [failed, setFailed] = useState(false);
	const initials = name
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
	const imageUrl = avatar && !failed ? getProfilePictureUrl(avatar) : null;

	return (
		<span className="inline-flex items-center gap-2">
			<span
				className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold text-white"
				style={
					imageUrl
						? undefined
						: { backgroundColor: getAvatarColor(userId || name) }
				}
			>
				{imageUrl ? (
					// eslint-disable-next-line @next/next/no-img-element -- Appwrite storage URL
					<img
						src={imageUrl}
						alt=""
						className="h-full w-full object-cover"
						onError={() => setFailed(true)}
					/>
				) : (
					initials || "?"
				)}
			</span>
			<span className="font-semibold text-slate-700">{name}</span>
		</span>
	);
}

function FieldValue({ field }: { field: AssistantActionField }) {
	if (field.kind === "assignee" && field.assignee) {
		return (
			<AssigneeFace
				name={field.assignee.name}
				userId={field.assignee.userId}
				avatar={field.assignee.avatar}
			/>
		);
	}

	if (
		field.kind === "badge" ||
		field.kind === "priority" ||
		field.kind === "status"
	) {
		const tone =
			field.badgeTone ?? (field.kind === "status" ? "green" : "slate");
		return (
			<span
				className={cn(
					"inline-block rounded-full border px-2 py-0.5 text-xs",
					BADGE_TONES[tone],
				)}
			>
				{field.value}
			</span>
		);
	}

	if (field.previousValue && field.previousValue !== field.value) {
		return (
			<span className="inline-flex flex-wrap items-center justify-end gap-1.5 text-right">
				<span className="text-slate-400 line-through">
					{field.previousValue}
				</span>
				<span className="text-slate-300" aria-hidden>
					→
				</span>
				<span className="font-semibold text-green">{field.value}</span>
			</span>
		);
	}

	return <span className="font-semibold text-slate-700">{field.value}</span>;
}

function EntityIcon({ toolName }: { toolName: string }) {
	if (toolName.includes("calendar") || toolName.includes("event")) {
		return <CalendarIcon className="h-4 w-4 text-[#0f5384]" />;
	}
	if (toolName.includes("invite") || toolName.includes("user")) {
		return <UserPlus className="h-4 w-4 text-[#0f5384]" />;
	}
	return <ListTodo className="h-4 w-4 text-[#0f5384]" />;
}

function isCreateTaskTool(toolName: string): boolean {
	return toolName === "create_task" || toolName === "create_task_for_contract";
}

function CreateTaskDraftEditor({
	pendingArgs,
	assigneeField,
	disabled,
	onPatch,
}: {
	pendingArgs?: Record<string, unknown>;
	assigneeField?: AssistantActionField;
	disabled?: boolean;
	onPatch?: (argsPatch: Record<string, unknown>) => void;
}) {
	const [title, setTitle] = useState(
		typeof pendingArgs?.title === "string" ? pendingArgs.title : "",
	);
	const [dueDate, setDueDate] = useState(
		typeof pendingArgs?.dueDate === "string" ? pendingArgs.dueDate : "",
	);
	const [priority, setPriority] = useState<Priority>(
		pendingArgs?.priority === "low" ||
			pendingArgs?.priority === "high" ||
			pendingArgs?.priority === "medium"
			? pendingArgs.priority
			: "medium",
	);
	const [description, setDescription] = useState(
		typeof pendingArgs?.description === "string" ? pendingArgs.description : "",
	);
	const [showNotes, setShowNotes] = useState(Boolean(description.trim()));

	useEffect(() => {
		setTitle(typeof pendingArgs?.title === "string" ? pendingArgs.title : "");
		setDueDate(
			typeof pendingArgs?.dueDate === "string" ? pendingArgs.dueDate : "",
		);
		setPriority(
			pendingArgs?.priority === "low" ||
				pendingArgs?.priority === "high" ||
				pendingArgs?.priority === "medium"
				? pendingArgs.priority
				: "medium",
		);
		setDescription(
			typeof pendingArgs?.description === "string"
				? pendingArgs.description
				: "",
		);
	}, [
		pendingArgs?.title,
		pendingArgs?.dueDate,
		pendingArgs?.priority,
		pendingArgs?.description,
	]);

	const patch = (next: Record<string, unknown>) => {
		onPatch?.(next);
	};

	const dueChips: Array<{ label: string; value: string }> = [
		{ label: "Today", value: dueDateIsoOffset(0) },
		{ label: "Tomorrow", value: dueDateIsoOffset(1) },
		{ label: "Next week", value: dueDateIsoOffset(7) },
	];

	return (
		<div className="space-y-0">
			{/* Title */}
			<div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
					<ListTodo className="h-4 w-4 text-[#0f5384]" />
				</div>
				<div className="min-w-0 flex-1 space-y-1">
					<label
						htmlFor="assistant-task-title"
						className="text-[10px] font-medium uppercase tracking-wide text-slate-500"
					>
						Title
					</label>
					<Input
						id="assistant-task-title"
						value={title}
						disabled={disabled}
						placeholder="What needs doing?"
						onChange={(e) => {
							const value = e.target.value;
							setTitle(value);
							patch({ title: value });
						}}
						className="h-9 border-[0.25px] border-slate-300 bg-white text-sm font-semibold text-slate-700"
					/>
					<p className="text-xs text-slate-500">ID assigned on creation</p>
				</div>
			</div>

			{/* Assignee (read-only) */}
			{assigneeField?.assignee ? (
				<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
					<span className="shrink-0 text-xs text-slate-500">Assignee</span>
					<AssigneeFace
						name={assigneeField.assignee.name}
						userId={assigneeField.assignee.userId}
						avatar={assigneeField.assignee.avatar}
					/>
				</div>
			) : null}

			{/* Due date chips + picker */}
			<div className="border-b border-slate-100 px-4 py-3">
				<p className="mb-2 text-xs text-slate-500">Due date</p>
				<div className="flex flex-wrap gap-1.5">
					{dueChips.map((chip) => {
						const selected = dueDate === chip.value;
						return (
							<button
								key={chip.label}
								type="button"
								disabled={disabled}
								onClick={() => {
									setDueDate(chip.value);
									patch({ dueDate: chip.value });
								}}
								className={cn(
									"cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors duration-200",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									"disabled:cursor-not-allowed disabled:opacity-50",
									selected
										? "border-[#0f5384]/30 bg-[#0f5384]/10 text-[#0f5384]"
										: "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50",
								)}
							>
								{chip.label}
							</button>
						);
					})}
					<button
						type="button"
						disabled={disabled}
						onClick={() => {
							setDueDate("");
							patch({ dueDate: "" });
						}}
						className={cn(
							"cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors duration-200",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
							!dueDate
								? "border-slate-300 bg-slate-100 text-slate-700"
								: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
						)}
					>
						None
					</button>
				</div>
				<div className="mt-2">
					<CaalmDatePicker
						value={dueDate}
						disabled={disabled}
						size="sm"
						placeholder="Pick a date"
						onChange={(iso) => {
							setDueDate(iso);
							patch({ dueDate: iso });
						}}
					/>
				</div>
			</div>

			{/* Priority — compact chips (not a full-width switch) */}
			<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
				<span className="shrink-0 text-xs text-slate-500">Priority</span>
				<div
					role="group"
					aria-label="Task priority"
					className="inline-flex items-center gap-1"
				>
					{(
						[
							{ value: "low", label: "Low" },
							{ value: "medium", label: "Med" },
							{ value: "high", label: "High" },
						] as const
					).map((opt) => {
						const selected = priority === opt.value;
						return (
							<button
								key={opt.value}
								type="button"
								disabled={disabled}
								aria-pressed={selected}
								onClick={() => {
									setPriority(opt.value);
									patch({ priority: opt.value });
								}}
								className={cn(
									"cursor-pointer rounded-full border px-2 py-0.5 text-[11px] transition-colors duration-200",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									"disabled:cursor-not-allowed disabled:opacity-50",
									selected
										? "border-[#0f5384]/30 bg-[#0f5384]/10 text-[#0f5384]"
										: "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50",
								)}
							>
								{opt.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Status badge (fixed) */}
			<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
				<span className="shrink-0 text-xs text-slate-500">Status</span>
				<span className="inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs text-green">
					Open
				</span>
			</div>

			{/* Optional notes */}
			<div className="px-4 py-3">
				{showNotes ? (
					<>
						<label
							htmlFor="assistant-task-notes"
							className="mb-1.5 block text-xs text-slate-500"
						>
							Notes{" "}
							<span className="font-normal text-slate-400">(optional)</span>
						</label>
						<Textarea
							id="assistant-task-notes"
							value={description}
							disabled={disabled}
							rows={2}
							placeholder="Add a short note…"
							onChange={(e) => {
								const value = e.target.value;
								setDescription(value);
								patch({ description: value });
							}}
							className="min-h-16 resize-y border-[0.25px] border-slate-300 bg-white text-sm text-slate-700"
						/>
					</>
				) : (
					<button
						type="button"
						disabled={disabled}
						onClick={() => setShowNotes(true)}
						className="cursor-pointer text-xs font-medium text-[#0f5384] hover:underline disabled:opacity-50"
					>
						+ Add notes
					</button>
				)}
			</div>
		</div>
	);
}

export default function AssistantActionLifecycleCard({
	action,
	pendingArgs,
	onConfirm,
	onCancel,
	onRetry,
	onOpenEntity,
	onArgsChange,
	disabled,
	/** Flat inside the message bubble — no nested card chrome. */
	embedded = false,
}: {
	action: AssistantActionLifecycle;
	/** Live pending args for the editable create-task draft */
	pendingArgs?: AssistantPendingAction["args"];
	onConfirm?: (argsPatch?: Record<string, unknown>) => void;
	onCancel?: () => void;
	onRetry?: () => void;
	onOpenEntity?: () => void;
	onArgsChange?: (argsPatch: Record<string, unknown>) => void;
	disabled?: boolean;
	embedded?: boolean;
}) {
	const [copiedCode, setCopiedCode] = useState(false);
	const [draftTitle, setDraftTitle] = useState(
		typeof pendingArgs?.title === "string"
			? pendingArgs.title
			: action.entityTitle,
	);

	useEffect(() => {
		if (typeof pendingArgs?.title === "string") {
			setDraftTitle(pendingArgs.title);
		}
	}, [pendingArgs?.title]);

	const isPending = action.state === "pending";
	const isFailed = action.state === "failed";
	const isCompleted = action.state === "completed";
	const draftMode =
		isPending && isCreateTaskTool(action.toolName) && Boolean(onArgsChange);

	const statusBadge = isPending
		? {
				label: "Awaiting confirmation",
				className: "bg-orange/10 text-orange border-orange/20",
			}
		: isFailed
			? {
					label: "Failed",
					className: "bg-red/10 text-red border-red/20",
				}
			: {
					label: "Completed",
					className: "bg-green/10 text-green border-green/20",
				};

	const HeaderIcon = isPending
		? Clock3
		: isFailed
			? AlertTriangle
			: CheckCircle2;
	const headerIconClass = isPending
		? "text-orange"
		: isFailed
			? "text-red"
			: "text-green";

	const assigneeField = action.fields.find((f) => f.kind === "assignee");
	const canConfirm = !draftMode || draftTitle.trim().length > 0;

	const copyErrorCode = async () => {
		if (!action.errorCode) return;
		try {
			await navigator.clipboard.writeText(action.errorCode);
			setCopiedCode(true);
			window.setTimeout(() => setCopiedCode(false), 2000);
		} catch {
			// ignore
		}
	};

	const handleDraftPatch = (argsPatch: Record<string, unknown>) => {
		if (typeof argsPatch.title === "string") {
			setDraftTitle(argsPatch.title);
		}
		onArgsChange?.(argsPatch);
	};

	return (
		<div
			className={cn(
				"relative w-full overflow-hidden text-left",
				embedded
					? "mt-0 bg-transparent"
					: "mt-2 rounded-xl border border-slate-200 bg-white shadow-sm",
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
				<div className="flex min-w-0 items-center gap-2">
					<HeaderIcon
						className={cn("h-4 w-4 shrink-0", headerIconClass)}
						aria-hidden
					/>
					<p className="truncate text-sm font-semibold text-slate-700">
						{action.actionLabel}
					</p>
				</div>
				<span
					className={cn(
						"inline-block shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
						statusBadge.className,
					)}
				>
					{statusBadge.label}
				</span>
			</div>

			{draftMode ? (
				<CreateTaskDraftEditor
					pendingArgs={pendingArgs}
					assigneeField={assigneeField}
					disabled={disabled}
					onPatch={handleDraftPatch}
				/>
			) : (
				<>
					{/* Entity */}
					<div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
							<EntityIcon toolName={action.toolName} />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-semibold text-slate-700">
								{action.entityTitle || "Untitled"}
							</p>
							<div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
								{action.entitySubtitle ? (
									<span className="tabular-nums">{action.entitySubtitle}</span>
								) : null}
								{action.entityHref && action.entityHrefLabel && isCompleted ? (
									<button
										type="button"
										onClick={onOpenEntity}
										className="inline-flex cursor-pointer items-center gap-1 font-medium text-green hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
									>
										{action.entityHrefLabel}
										<ExternalLink className="h-3 w-3" aria-hidden />
									</button>
								) : null}
							</div>
						</div>
					</div>

					{/* Fields */}
					{action.fields.length > 0 ? (
						<div className="px-4">
							{action.fields.map((field, index) => (
								<div
									key={`${field.label}-${index}`}
									className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0"
								>
									<span className="shrink-0 text-xs text-slate-500">
										{field.label}
									</span>
									<div className="min-w-0 text-right text-xs">
										<FieldValue field={field} />
									</div>
								</div>
							))}
						</div>
					) : null}
				</>
			)}

			{/* Failure alert */}
			{isFailed && action.errorMessage ? (
				<div className="mx-4 mb-3 rounded-lg border border-red/20 bg-red/10 px-3 py-2.5">
					<p className="text-sm font-medium text-slate-700">
						{action.errorMessage}
					</p>
					{action.errorCode ? (
						<p className="mt-1 text-xs tabular-nums text-red">
							{action.errorCode}
						</p>
					) : null}
				</div>
			) : null}

			{/* Footer */}
			<div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
				<p className="min-w-0 text-xs text-slate-500">
					{draftMode ? "Edit the draft, then confirm." : action.footerNote}
					{!draftMode && action.footerNote && isCompleted ? (
						<button
							type="button"
							onClick={onOpenEntity}
							className="ml-1 cursor-pointer text-[#0f5384] hover:underline"
						>
							details
						</button>
					) : null}
				</p>

				{isPending ? (
					<div className="flex shrink-0 items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="cursor-pointer border-[0.25px] border-slate-300"
							onClick={onCancel}
							disabled={disabled}
						>
							Cancel
						</Button>
						<Button
							type="button"
							size="sm"
							className="primary-btn cursor-pointer gap-1.5 px-3"
							onClick={() => onConfirm?.()}
							disabled={disabled || !canConfirm}
						>
							{disabled ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Check className="h-3.5 w-3.5" />
							)}
							Confirm
						</Button>
					</div>
				) : null}

				{isFailed ? (
					<div className="flex shrink-0 items-center gap-2">
						{action.errorCode ? (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="cursor-pointer gap-1.5 border-[0.25px] border-slate-300"
								onClick={() => void copyErrorCode()}
							>
								{copiedCode ? (
									<Check className="h-3.5 w-3.5 text-green" />
								) : (
									<Copy className="h-3.5 w-3.5" />
								)}
								Copy ID
							</Button>
						) : null}
						<Button
							type="button"
							size="sm"
							className="primary-btn cursor-pointer gap-1.5 px-3"
							onClick={onRetry}
							disabled={disabled}
						>
							{disabled ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<RefreshCw className="h-3.5 w-3.5" />
							)}
							Retry
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}
