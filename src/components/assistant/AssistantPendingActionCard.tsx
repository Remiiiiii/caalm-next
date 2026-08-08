"use client";

import {
	CalendarCheck2,
	ChevronsUpDown,
	FileText,
	Search,
	Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AssistantPendingAction } from "@/components/assistant/assistantTypes";
import { getAvatarColor } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getProfilePictureUrl } from "@/lib/utils";

type DirectoryUser = {
	$id: string;
	fullName: string;
	email: string;
	department: string;
	avatar?: string | null;
};

function ordinalDay(day: number): string {
	const j = day % 10;
	const k = day % 100;
	if (j === 1 && k !== 11) return `${day}st`;
	if (j === 2 && k !== 12) return `${day}nd`;
	if (j === 3 && k !== 13) return `${day}rd`;
	return `${day}th`;
}

function formatMeetingDate(dateStr: unknown): string | null {
	if (typeof dateStr !== "string" || !dateStr.trim()) return null;
	const part = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
	const [y, m, d] = part.split("-").map(Number);
	if (!y || !m || !d) return dateStr;
	const date = new Date(y, m - 1, d);
	if (Number.isNaN(date.getTime())) return dateStr;
	const month = date.toLocaleString("en-US", { month: "long" });
	return `${ordinalDay(d)} ${month}`;
}

function formatClock(timeStr: unknown): string | null {
	if (typeof timeStr !== "string" || !timeStr.trim()) return null;
	const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
	if (!match) return timeStr.trim();
	return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function resolveEndTime(args: Record<string, unknown>): string | null {
	const explicit = formatClock(args.endTime);
	if (explicit) return explicit;

	const start = formatClock(args.startTime);
	const duration = Number(args.durationMinutes);
	if (!start || !Number.isFinite(duration) || duration <= 0) return null;

	const [h, m] = start.split(":").map(Number);
	const total = h * 60 + m + duration;
	const eh = Math.floor(total / 60) % 24;
	const em = total % 60;
	return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

function typeLabel(raw: unknown): string {
	const value = typeof raw === "string" ? raw.trim().toLowerCase() : "meeting";
	const map: Record<string, string> = {
		meeting: "Meeting",
		review: "Review",
		audit: "Audit",
		deadline: "Deadline",
		contract: "Contract",
	};
	return map[value] ?? "Meeting";
}

function formatParticipantsArg(users: DirectoryUser[]): string {
	return users.map((u) => `${u.fullName} <${u.email}>`).join(", ");
}

function emailsFromParticipantsArg(raw: unknown): string[] {
	if (typeof raw !== "string" || !raw.trim()) return [];
	return raw
		.split(",")
		.map((chunk) => {
			const emailMatch = chunk.match(/<([^>]+)>/);
			if (emailMatch?.[1]) return emailMatch[1].trim().toLowerCase();
			const plain = chunk.trim();
			return plain.includes("@") ? plain.toLowerCase() : "";
		})
		.filter(Boolean);
}

function UserFace({
	user,
	size = 24,
	className,
}: {
	user: DirectoryUser;
	size?: number;
	className?: string;
}) {
	const [failed, setFailed] = useState(false);
	const initials = user.fullName
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
	const imageUrl =
		user.avatar && !failed ? getProfilePictureUrl(user.avatar) : null;

	return (
		<div
			className={cn(
				"shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm",
				className,
			)}
			style={{ width: size, height: size }}
			title={user.fullName}
		>
			{imageUrl ? (
				<img
					src={imageUrl}
					alt=""
					className="h-full w-full object-cover"
					onError={() => setFailed(true)}
				/>
			) : (
				<div
					className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white"
					style={{ backgroundColor: getAvatarColor(user.$id) }}
				>
					{initials || "U"}
				</div>
			)}
		</div>
	);
}

function StackedParticipantAvatars({ users }: { users: DirectoryUser[] }) {
	const maxDisplay = users.length > 5 ? 4 : users.length;
	const remaining = users.length > 5 ? users.length - 4 : 0;
	const visible = users.slice(0, maxDisplay);

	return (
		<div
			className="flex items-center"
			role="list"
			aria-label="Selected participants"
		>
			{visible.map((user, index) => (
				<TooltipProvider key={user.$id}>
					<Tooltip>
						<TooltipTrigger asChild>
							<span
								className={cn("inline-block", index > 0 && "-ml-2")}
								role="listitem"
							>
								<UserFace user={user} size={24} />
							</span>
						</TooltipTrigger>
						<TooltipContent>
							<p>{user.fullName}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			))}
			{remaining > 0 ? (
				<span
					className="-ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-700 shadow-sm"
					role="listitem"
					title={`${remaining} more participants`}
				>
					+{remaining}
				</span>
			) : null}
		</div>
	);
}

function ParticipantsPickerDialog({
	open,
	onOpenChange,
	selectedIds,
	onApply,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedIds: string[];
	onApply: (users: DirectoryUser[]) => void;
}) {
	const [users, setUsers] = useState<DirectoryUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [draftIds, setDraftIds] = useState<string[]>(selectedIds);

	useEffect(() => {
		if (!open) return;
		setDraftIds(selectedIds);
		setQuery("");
		let cancelled = false;
		setLoading(true);
		setError(null);
		void fetch("/api/users/directory")
			.then(async (res) => {
				const data = await res.json();
				if (!res.ok) {
					throw new Error(
						typeof data?.error === "string"
							? data.error
							: "Failed to load users",
					);
				}
				if (!cancelled) {
					setUsers(Array.isArray(data) ? data : []);
				}
			})
			.catch((e) => {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : "Failed to load users");
					setUsers([]);
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open, selectedIds]);

	const grouped = useMemo(() => {
		const q = query.trim().toLowerCase();
		const filtered = users.filter((u) => {
			if (!q) return true;
			return (
				u.fullName.toLowerCase().includes(q) ||
				u.email.toLowerCase().includes(q) ||
				u.department.toLowerCase().includes(q)
			);
		});
		const map = new Map<string, DirectoryUser[]>();
		for (const user of filtered) {
			const dept = user.department || "Other";
			const list = map.get(dept) ?? [];
			list.push(user);
			map.set(dept, list);
		}
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
	}, [users, query]);

	const toggle = (id: string) => {
		setDraftIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[520px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-linear-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<Users className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Add participants
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						Select people by department
					</p>
				</div>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search by name, email, or department"
							className="bg-white pl-9 border-slate-300 focus-visible:border-[#078FAB] focus-visible:ring-[#078FAB]"
						/>
					</div>

					{loading ? (
						<LoadingSpinner size="sm" label="Loading people…" />
					) : error ? (
						<p className="text-sm text-red-600">{error}</p>
					) : grouped.length === 0 ? (
						<p className="text-sm text-slate-600">No people found.</p>
					) : (
						grouped.map(([department, deptUsers]) => (
							<section
								key={department}
								className="rounded-xl border border-slate-200 bg-white overflow-hidden"
							>
								<h3 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#0f5384]">
									{department}
								</h3>
								<ul className="divide-y divide-slate-100">
									{deptUsers.map((user) => {
										const checked = draftIds.includes(user.$id);
										return (
											<li key={user.$id}>
												<button
													type="button"
													onClick={() => toggle(user.$id)}
													className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none"
												>
													<div
														className="flex items-center"
														onClick={(e) => e.stopPropagation()}
														onKeyDown={(e) => e.stopPropagation()}
													>
														<Checkbox
															checked={checked}
															onCheckedChange={() => toggle(user.$id)}
															className="cursor-pointer"
															aria-label={`Select ${user.fullName}`}
														/>
													</div>
													<UserFace user={user} size={32} />
													<span className="min-w-0 flex-1">
														<span className="block truncate text-sm font-medium text-slate-700">
															{user.fullName}
														</span>
														<span className="block truncate text-xs text-slate-500">
															{user.email}
														</span>
													</span>
												</button>
											</li>
										);
									})}
								</ul>
							</section>
						))
					)}
				</div>

				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
					<p className="text-xs text-slate-500">{draftIds.length} selected</p>
					<div className="flex items-center gap-3">
						<Button
							type="button"
							variant="outline"
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={() => {
								const selected = users.filter((u) => draftIds.includes(u.$id));
								onApply(selected);
								onOpenChange(false);
							}}
						>
							Apply
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function MeetingPreview({
	args,
	disabled,
	onPatchChange,
}: {
	args: Record<string, unknown>;
	disabled?: boolean;
	onPatchChange: (
		patch: Partial<{ description: string; participants: string }>,
	) => void;
}) {
	const [agenda, setAgenda] = useState(
		typeof args.description === "string" ? args.description : "",
	);
	const [selected, setSelected] = useState<DirectoryUser[]>([]);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [directory, setDirectory] = useState<DirectoryUser[]>([]);

	const title =
		typeof args.title === "string" && args.title.trim()
			? args.title.trim()
			: "Untitled meeting";
	const dateLabel = formatMeetingDate(args.date);
	const start = formatClock(args.startTime);
	const end = resolveEndTime(args);
	const kind = typeLabel(args.type);
	const location =
		typeof args.location === "string" ? args.location.trim() : "";
	const timeLine =
		start && end ? `${start} – ${end}` : start ? start : end ? end : null;

	// Keep local fields aligned when pending args are restored after remount
	useEffect(() => {
		setAgenda(typeof args.description === "string" ? args.description : "");
	}, [args.description]);

	// Prefetch directory so we can resolve any emails already on the pending action
	useEffect(() => {
		let cancelled = false;
		void fetch("/api/users/directory")
			.then(async (res) => {
				const data = await res.json();
				if (!res.ok || !Array.isArray(data) || cancelled) return;
				setDirectory(data as DirectoryUser[]);
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (directory.length === 0) return;
		const emails = new Set(emailsFromParticipantsArg(args.participants));
		if (emails.size === 0) {
			setSelected([]);
			return;
		}
		setSelected(directory.filter((u) => emails.has(u.email.toLowerCase())));
	}, [directory, args.participants]);

	return (
		<>
			<div className="glass-card overflow-hidden text-left">
				<div className="glass-card-cap" />
				<div className="relative z-[1] px-4 pb-4 pt-6 sm:px-5 sm:pb-5 sm:pt-7">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-base font-semibold sidebar-gradient-text leading-snug">
								{title}
							</p>
							<p className="mt-1 text-xs text-slate-600">
								Review the details, then confirm to schedule.
							</p>
						</div>
						<span className="shrink-0 rounded-full border border-blue/20 bg-blue/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#0f5384]">
							{kind}
						</span>
					</div>

					<div className="mt-4 flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-linear-to-br from-[#00C1CB]/15 via-[#0E638F]/10 to-[#162768]/10">
							<CalendarCheck2 className="h-4 w-4 text-[#0f5384]" />
						</div>
						<div className="min-w-0 pt-0.5">
							<p className="text-sm font-semibold text-slate-700">
								{dateLabel ?? "Date TBD"}
							</p>
							<p className="mt-0.5 text-sm text-slate-600">
								{timeLine ?? "Time TBD"}
							</p>
						</div>
					</div>

					<div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3">
						<label
							htmlFor="meeting-agenda"
							className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"
						>
							<FileText className="h-3.5 w-3.5 text-[#0f5384]" />
							Meeting agenda{" "}
							<span className="font-normal text-xs text-slate-500">
								(optional)
							</span>
						</label>
						<Textarea
							id="meeting-agenda"
							value={agenda}
							disabled={disabled}
							rows={3}
							placeholder="Add agenda or notes for this meeting…"
							onChange={(e) => {
								const value = e.target.value;
								setAgenda(value);
								// Agenda-only patch — never clear participants while typing
								onPatchChange({ description: value });
							}}
							className="min-h-[4.5rem] resize-y border-slate-300 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus-visible:border-[#078FAB] focus-visible:ring-[#078FAB]"
						/>
						{location ? (
							<p className="mt-2 text-xs text-slate-500">
								Location: {location}
							</p>
						) : null}
					</div>

					<button
						type="button"
						disabled={disabled}
						onClick={() => setPickerOpen(true)}
						className="mt-4 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-3 text-left transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-60"
					>
						<div className="flex min-w-0 items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-linear-to-br from-[#00C1CB]/15 via-[#0E638F]/10 to-[#162768]/10">
								<Users className="h-4 w-4 text-[#0f5384]" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-semibold text-slate-700">
									Participants{" "}
									<span className="font-normal text-xs text-slate-500">
										(optional)
									</span>
								</p>
								<div className="mt-0.5 flex min-w-0 items-center gap-2">
									<p className="text-xs text-slate-600">
										{selected.length > 0
											? `${selected.length} invited`
											: "None listed yet"}
									</p>
									{selected.length > 0 ? (
										<StackedParticipantAvatars users={selected} />
									) : null}
								</div>
							</div>
						</div>
						<ChevronsUpDown className="h-4 w-4 shrink-0 text-[#0f5384]" />
					</button>
				</div>
			</div>

			<ParticipantsPickerDialog
				open={pickerOpen}
				onOpenChange={setPickerOpen}
				selectedIds={selected.map((u) => u.$id)}
				onApply={(users) => {
					setSelected(users);
					onPatchChange({
						participants: formatParticipantsArg(users),
					});
				}}
			/>
		</>
	);
}

function GenericPreview({
	label,
	args,
	preview,
}: {
	label: string;
	args?: Record<string, unknown>;
	preview: string;
}) {
	const entries = args
		? Object.entries(args).filter(
				([, v]) => v !== undefined && v !== null && String(v).trim() !== "",
			)
		: [];

	return (
		<div className="glass-card overflow-hidden">
			<div className="glass-card-cap" />
			<div className="relative z-[1] px-4 pb-4 pt-6">
				<p className="text-sm font-semibold sidebar-gradient-text">{label}</p>
				{entries.length > 0 ? (
					<dl className="mt-3 space-y-2">
						{entries.map(([key, value]) => (
							<div key={key} className="flex gap-2 text-sm">
								<dt className="w-28 shrink-0 capitalize text-slate-500">
									{key.replace(/([A-Z])/g, " $1").trim()}
								</dt>
								<dd className="min-w-0 flex-1 wrap-break-word text-slate-700">
									{String(value)}
								</dd>
							</div>
						))}
					</dl>
				) : (
					<pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
						{preview}
					</pre>
				)}
			</div>
		</div>
	);
}

export default function AssistantPendingActionCard({
	action,
	onConfirm,
	onArgsChange,
	disabled,
}: {
	action: AssistantPendingAction;
	onConfirm: (argsPatch?: Record<string, unknown>) => void;
	onArgsChange?: (argsPatch: Record<string, unknown>) => void;
	disabled?: boolean;
}) {
	const args = action.args ?? {};
	const isMeeting = action.toolName === "create_calendar_event";
	const [meetingPatch, setMeetingPatch] = useState<{
		description: string;
		participants: string;
	}>({
		description: typeof args.description === "string" ? args.description : "",
		participants:
			typeof args.participants === "string" ? args.participants : "",
	});

	useEffect(() => {
		setMeetingPatch({
			description: typeof args.description === "string" ? args.description : "",
			participants:
				typeof args.participants === "string" ? args.participants : "",
		});
	}, [action.id, args.description, args.participants]);

	const handlePatchChange = (
		patch: Partial<{ description: string; participants: string }>,
	) => {
		setMeetingPatch((prev) => ({ ...prev, ...patch }));
		onArgsChange?.(patch);
	};

	return (
		<div className="space-y-3">
			{isMeeting ? (
				<MeetingPreview
					args={args}
					disabled={disabled}
					onPatchChange={handlePatchChange}
				/>
			) : (
				<GenericPreview
					label={action.label}
					args={action.args}
					preview={action.preview}
				/>
			)}
			<div className="flex justify-end">
				<Button
					type="button"
					size="sm"
					className="primary-btn rounded-full px-4 cursor-pointer"
					onClick={() => onConfirm(isMeeting ? meetingPatch : undefined)}
					disabled={disabled}
				>
					Confirm
				</Button>
			</div>
		</div>
	);
}
