"use client";

import { ArrowRight, Check, Info, PackagePlus, X } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { TaskAssigneeFilter } from "@/components/tasks/TaskAssigneeFilter";
import { CAALM_BADGE_BASE } from "@/components/tasks/task-ui";
import { AppDialog } from "@/components/ui/app-dialog";
import Avatar from "@/components/ui/avatar";
import { BusyIcon } from "@/components/ui/busy-icon";
import { Button } from "@/components/ui/button";
import {
	CaalmDatePicker,
	parseIsoDateLocal,
} from "@/components/ui/caalm-date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DIALOG_CANCEL_BTN_CLASS } from "@/components/ui/dialog-cancel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTaskPeople } from "@/hooks/useTaskPeople";
import {
	clearNewSessionDraft,
	loadNewSessionDraft,
	newSessionDraftHasContent,
	saveNewSessionDraft,
} from "@/lib/audit-lab/new-session-draft";
import type {
	ReviewSession,
	SessionParticipant,
	SessionRole,
} from "@/lib/audit-lab/types";
import { parseParticipants } from "@/lib/audit-lab/types";
import { cn } from "@/lib/utils";
import { CONTRACT_DEPARTMENTS } from "../../../constants";

type Step = 1 | 2 | 3 | 4;

/** Human-assignable seats in the New simulation dialog (mock auditor is AI). */
const HUMAN_SESSION_ROLES = [
	"facilitator",
	"interviewee",
	"observer",
] as const satisfies readonly SessionRole[];

type HumanSessionRole = (typeof HUMAN_SESSION_ROLES)[number];

const HUMAN_ROLE_LABELS: Record<HumanSessionRole, string> = {
	facilitator: "Facilitator",
	interviewee: "Interviewee",
	observer: "Observer",
};

const AI_MOCK_AUDITOR: SessionParticipant = {
	userId: "ai-mock-auditor",
	name: "AI auditor",
	role: "mock_auditor",
};

export type SchedulingConflict = {
	participantName: string;
	participantId: string;
	conflictingSimulationName: string;
	conflictingSimulationId: string;
	overlapDate: string;
};

/** Local calendar day → ISO at 09:00 (scheduled start). */
function dateToScheduledIso(date: string): string | undefined {
	const parsed = parseIsoDateLocal(date);
	if (!parsed) return undefined;
	parsed.setHours(9, 0, 0, 0);
	return parsed.toISOString();
}

/**
 * Prep deadline ISO. Same calendar day as the session uses 08:00 so it stays
 * before the 09:00 scheduled start; earlier days use 17:00.
 */
function dateToPrepIso(
	date: string,
	scheduledDate?: string,
): string | undefined {
	const parsed = parseIsoDateLocal(date);
	if (!parsed) return undefined;
	const sameDay = Boolean(scheduledDate && date === scheduledDate);
	parsed.setHours(sameDay ? 8 : 17, 0, 0, 0);
	return parsed.toISOString();
}

function isPrepAfterScheduled(prep: string, scheduled: string): boolean {
	if (!prep || !scheduled) return false;
	return prep > scheduled;
}

function formatDisplayDate(date: string): string {
	const parsed = parseIsoDateLocal(date);
	if (!parsed) return date;
	return parsed.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatOverlapDay(iso: string): string {
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return iso;
	return new Date(ms).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function startOfWeekMs(ms: number): number {
	const d = new Date(ms);
	d.setHours(0, 0, 0, 0);
	const day = d.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	return d.getTime();
}

/** Participants booked on another simulation in the same week as the new start. */
export function findSchedulingConflicts(input: {
	participantIds: string[];
	peopleById: Map<string, { name: string }>;
	scheduledDate: string;
	existingSessions: ReviewSession[];
}): SchedulingConflict[] {
	if (!input.scheduledDate || input.participantIds.length === 0) return [];
	const startIso = dateToScheduledIso(input.scheduledDate);
	if (!startIso) return [];
	const startMs = Date.parse(startIso);
	if (Number.isNaN(startMs)) return [];
	const weekStart = startOfWeekMs(startMs);
	const weekEnd = weekStart + 7 * 86_400_000;
	const selected = new Set(input.participantIds);
	const conflicts: SchedulingConflict[] = [];

	for (const session of input.existingSessions) {
		if (
			session.status === "cancelled" ||
			session.status === "archived" ||
			session.status === "completed" ||
			session.status === "report_ready"
		) {
			continue;
		}
		if (!session.scheduledAt) continue;
		const otherMs = Date.parse(session.scheduledAt);
		if (Number.isNaN(otherMs) || otherMs < weekStart || otherMs >= weekEnd) {
			continue;
		}
		for (const person of parseParticipants(session.participantsJson)) {
			if (!person.userId || !selected.has(person.userId)) continue;
			conflicts.push({
				participantId: person.userId,
				participantName:
					input.peopleById.get(person.userId)?.name ||
					person.name?.trim() ||
					"Participant",
				conflictingSimulationId: session.$id,
				conflictingSimulationName: session.title,
				overlapDate: session.scheduledAt,
			});
		}
	}

	return conflicts;
}

const STEP_COPY: Record<Step, { title: string; description: string }> = {
	1: {
		title: "New review simulation",
		description: "Name the run and set when prep and the live session start.",
	},
	2: {
		title: "Participants",
		description:
			"Choose who joins this simulation before you lock the calendar.",
	},
	3: {
		title: "Participant load & overlap check",
		description: "Scheduling becomes read-only after this step.",
	},
	4: {
		title: "Review and schedule",
		description: "Confirm the details, then create the simulation.",
	},
};

export function NewSessionDialog({
	open,
	onOpenChange,
	onSubmit,
	existingSessions = [],
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	existingSessions?: ReviewSession[];
	onSubmit: (payload: {
		title: string;
		department: string;
		framework: string;
		scheduledAt?: string;
		prepDeadlineAt?: string;
		participants?: SessionParticipant[];
	}) => Promise<void>;
}) {
	const people = useTaskPeople(open);
	const [step, setStep] = useState<Step>(1);
	const [title, setTitle] = useState("");
	const [department, setDepartment] = useState("");
	const [framework, setFramework] = useState("SOC 2");
	const [scheduledDate, setScheduledDate] = useState("");
	const [prepDeadlineDate, setPrepDeadlineDate] = useState("");
	const [participantIdsCsv, setParticipantIdsCsv] = useState("");
	const [roleByUserId, setRoleByUserId] = useState<
		Record<string, HumanSessionRole>
	>({});
	const [busy, setBusy] = useState(false);
	const [ackCheck, setAckCheck] = useState(false);
	const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
	/** Skip the first persist pass after hydrate so we do not overwrite storage. */
	const skipNextPersistRef = useRef(false);
	const hydratedRef = useRef(false);

	const resetForm = () => {
		setStep(1);
		setTitle("");
		setDepartment("");
		setFramework("SOC 2");
		setScheduledDate("");
		setPrepDeadlineDate("");
		setParticipantIdsCsv("");
		setRoleByUserId({});
		setAckCheck(false);
	};

	const clearDraftAndReset = () => {
		clearNewSessionDraft();
		resetForm();
	};

	const persistDraft = () => {
		const draft = {
			step,
			title,
			department,
			framework,
			scheduledDate,
			prepDeadlineDate,
			participantIdsCsv,
			roleByUserId,
			ackCheck,
		};
		if (newSessionDraftHasContent(draft)) {
			saveNewSessionDraft(draft);
		} else {
			clearNewSessionDraft();
		}
	};

	// Restore draft when the dialog opens (or on first mount if already open).
	useEffect(() => {
		if (!open) return;
		if (hydratedRef.current) return;
		hydratedRef.current = true;
		const draft = loadNewSessionDraft();
		if (!draft || !newSessionDraftHasContent(draft)) return;
		skipNextPersistRef.current = true;
		if (
			draft.step === 1 ||
			draft.step === 2 ||
			draft.step === 3 ||
			draft.step === 4
		) {
			setStep(draft.step);
		}
		if (typeof draft.title === "string") setTitle(draft.title);
		if (typeof draft.department === "string") setDepartment(draft.department);
		if (typeof draft.framework === "string") setFramework(draft.framework);
		if (typeof draft.scheduledDate === "string") {
			setScheduledDate(draft.scheduledDate);
		}
		if (typeof draft.prepDeadlineDate === "string") {
			setPrepDeadlineDate(draft.prepDeadlineDate);
		}
		if (typeof draft.participantIdsCsv === "string") {
			setParticipantIdsCsv(draft.participantIdsCsv);
		}
		if (draft.roleByUserId && typeof draft.roleByUserId === "object") {
			const next: Record<string, HumanSessionRole> = {};
			for (const [id, role] of Object.entries(draft.roleByUserId)) {
				if ((HUMAN_SESSION_ROLES as readonly string[]).includes(role)) {
					next[id] = role as HumanSessionRole;
				}
			}
			setRoleByUserId(next);
		}
		if (typeof draft.ackCheck === "boolean") setAckCheck(draft.ackCheck);
	}, [open]);

	// Keep sessionStorage in sync while the wizard is in progress.
	useEffect(() => {
		if (!open) return;
		if (skipNextPersistRef.current) {
			skipNextPersistRef.current = false;
			return;
		}
		persistDraft();
		// persistDraft closes over the latest field values listed below.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional field snapshot
	}, [
		open,
		step,
		title,
		department,
		framework,
		scheduledDate,
		prepDeadlineDate,
		participantIdsCsv,
		roleByUserId,
		ackCheck,
	]);

	const participantIds = useMemo(
		() =>
			participantIdsCsv
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean),
		[participantIdsCsv],
	);

	const handleParticipantsChange = (nextCsv: string) => {
		setParticipantIdsCsv(nextCsv);
		const nextIds = nextCsv
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean);
		setRoleByUserId((prev) => {
			const next: Record<string, HumanSessionRole> = {};
			for (const id of nextIds) {
				next[id] = prev[id] ?? "interviewee";
			}
			return next;
		});
	};

	const removeParticipant = (userId: string) => {
		handleParticipantsChange(
			participantIds.filter((id) => id !== userId).join(","),
		);
	};

	const peopleById = useMemo(() => {
		const map = new Map<
			string,
			{ name: string; email?: string | null; imageUrl?: string | null }
		>();
		for (const person of people) {
			map.set(person.id, {
				name: person.name,
				email: person.email,
				imageUrl: person.imageUrl,
			});
		}
		return map;
	}, [people]);

	const conflicts = useMemo(
		() =>
			findSchedulingConflicts({
				participantIds,
				peopleById,
				scheduledDate,
				existingSessions,
			}),
		[participantIds, peopleById, scheduledDate, existingSessions],
	);

	const copy = STEP_COPY[step];
	const prepAfterScheduled = isPrepAfterScheduled(
		prepDeadlineDate,
		scheduledDate,
	);
	const canAdvanceStep1 = department.trim().length > 0 && !prepAfterScheduled;
	const canAdvanceStep2 = true;
	const needsAck = conflicts.length > 0;
	const canAdvanceStep3 = !needsAck || ackCheck;

	const handleScheduledChange = (next: string) => {
		setScheduledDate(next);
		setAckCheck(false);
		if (
			prepDeadlineDate &&
			next &&
			isPrepAfterScheduled(prepDeadlineDate, next)
		) {
			setPrepDeadlineDate(next);
		}
	};

	const handlePrepChange = (next: string) => {
		if (next && scheduledDate && isPrepAfterScheduled(next, scheduledDate)) {
			return;
		}
		setPrepDeadlineDate(next);
	};

	const humanParticipants: SessionParticipant[] = participantIds.map((id) => ({
		userId: id,
		name: peopleById.get(id)?.name,
		email: peopleById.get(id)?.email ?? undefined,
		role: roleByUserId[id] ?? "interviewee",
	}));

	const facilitators = humanParticipants.filter(
		(p) => p.role === "facilitator",
	);
	const interviewees = humanParticipants.filter(
		(p) => p.role === "interviewee",
	);
	const observers = humanParticipants.filter((p) => p.role === "observer");
	const rosterTotal = humanParticipants.length + 1;

	/** Humans plus the default AI mock auditor (Forensic persona). */
	const selectedParticipants: SessionParticipant[] = [
		...humanParticipants,
		AI_MOCK_AUDITOR,
	];

	const setHumanRole = (userId: string, role: HumanSessionRole) => {
		setRoleByUserId((prev) => ({ ...prev, [userId]: role }));
	};

	/** Read-only avatar + name card for the Review step roster. */
	const renderReviewPersonCard = (person: SessionParticipant) => {
		const profile = peopleById.get(person.userId);
		const displayName = person.name || person.userId;
		return (
			<li key={person.userId} className="flex min-w-0 items-center gap-2">
				<Avatar
					userId={person.userId}
					name={displayName}
					size="xs"
					imageUrl={profile?.imageUrl}
				/>
				<p className="truncate text-xs font-medium text-slate-700">
					{displayName}
				</p>
			</li>
		);
	};

	const requestCancel = () => {
		if (busy) return;
		setCancelConfirmOpen(true);
	};

	const confirmCancelAndClose = async () => {
		clearDraftAndReset();
		hydratedRef.current = false;
		setCancelConfirmOpen(false);
		onOpenChange(false);
	};

	const renderReviewRoleSection = ({
		title,
		countBadge,
		people: sectionPeople,
	}: {
		title: string;
		countBadge?: number;
		people: SessionParticipant[];
	}) => {
		if (sectionPeople.length === 0) return null;
		const multi = sectionPeople.length > 1;
		return (
			<section className="space-y-2">
				<div className="flex items-center gap-2">
					<p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
						{title}
					</p>
					{typeof countBadge === "number" && countBadge > 1 ? (
						<span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
							{countBadge}
						</span>
					) : null}
				</div>
				<ul
					className={cn(
						"gap-x-4 gap-y-2.5",
						multi ? "grid grid-cols-2" : "grid grid-cols-1",
					)}
				>
					{sectionPeople.map((person) => renderReviewPersonCard(person))}
				</ul>
			</section>
		);
	};

	return (
		<>
			<AppDialog
				open={open}
				onOpenChange={(next) => {
					if (!next) {
						// Keep progress: persist then leave form state for the next open.
						persistDraft();
					}
					onOpenChange(next);
				}}
				size="form"
				pending={busy}
				icon={<PackagePlus className="h-5 w-5" aria-hidden />}
				title={copy.title}
				description={copy.description}
				onBack={
					step > 1
						? () => {
								setStep((s) => (s - 1) as Step);
								if (step === 3) setAckCheck(false);
							}
						: undefined
				}
				footer={
					<div className="flex w-full items-center justify-end gap-2.5">
						<Button
							type="button"
							variant="ghost"
							className={DIALOG_CANCEL_BTN_CLASS}
							disabled={busy}
							onClick={requestCancel}
						>
							Cancel
						</Button>
						{step < 4 ? (
							<Button
								type="button"
								className="btn-primary px-3 sm:px-4"
								disabled={
									busy ||
									(step === 1 && !canAdvanceStep1) ||
									(step === 2 && !canAdvanceStep2) ||
									(step === 3 && !canAdvanceStep3)
								}
								onClick={() => {
									if (step === 2) setAckCheck(false);
									setStep((s) => (s + 1) as Step);
								}}
							>
								Next
								<ArrowRight className="h-4 w-4" aria-hidden />
							</Button>
						) : (
							<Button
								type="button"
								className="btn-primary px-3 sm:px-4"
								disabled={busy || !canAdvanceStep1}
								onClick={async () => {
									setBusy(true);
									try {
										await onSubmit({
											title,
											department,
											framework,
											scheduledAt: scheduledDate
												? dateToScheduledIso(scheduledDate)
												: undefined,
											prepDeadlineAt: prepDeadlineDate
												? dateToPrepIso(prepDeadlineDate, scheduledDate)
												: undefined,
											participants: selectedParticipants,
										});
										clearDraftAndReset();
										hydratedRef.current = false;
										onOpenChange(false);
									} finally {
										setBusy(false);
									}
								}}
							>
								<BusyIcon busy={busy} icon={Check} />
								{busy ? "Scheduling…" : "Schedule simulation"}
							</Button>
						)}
					</div>
				}
			>
				{step === 1 ? (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="new-sim-title">Simulation title</Label>
							<Input
								id="new-sim-title"
								placeholder="e.g. Q2 access control dry run"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="bg-white"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-sim-department">Department</Label>
							<Select
								value={department || undefined}
								onValueChange={setDepartment}
							>
								<SelectTrigger
									id="new-sim-department"
									className="cursor-pointer bg-white"
								>
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
							<div className="flex items-center gap-1.5">
								<Label htmlFor="new-sim-framework">Framework</Label>
								<TooltipProvider delayDuration={200}>
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
												aria-label="What is a framework?"
											>
												<Info className="h-3.5 w-3.5" aria-hidden />
											</button>
										</TooltipTrigger>
										<TooltipContent
											side="bottom"
											align="start"
											sideOffset={6}
											collisionPadding={16}
											className="max-w-xs text-left text-xs font-normal text-slate-600"
										>
											<p className="text-xs font-normal text-slate-600">
												The compliance standard this simulation rehearses (for
												example SOC 2 or ISO 27001). It shapes which controls
												and questions get pulled into the run.
											</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
							<Input
								id="new-sim-framework"
								placeholder="SOC 2, ISO 27001, …"
								value={framework}
								onChange={(e) => setFramework(e.target.value)}
								className="bg-white"
							/>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="new-sim-prep">Prep deadline</Label>
								<CaalmDatePicker
									id="new-sim-prep"
									value={prepDeadlineDate}
									onChange={handlePrepChange}
									placeholder="Pick a date"
									disablePast
									maxDate={scheduledDate || undefined}
								/>
								{prepAfterScheduled ? (
									<p className="text-[11px] text-red" role="alert">
										Must be on or before the scheduled start.
									</p>
								) : null}
							</div>
							<div className="space-y-2">
								<Label htmlFor="new-sim-scheduled">Scheduled start</Label>
								<CaalmDatePicker
									id="new-sim-scheduled"
									value={scheduledDate}
									onChange={handleScheduledChange}
									placeholder="Pick a date"
									disablePast
									minDate={prepDeadlineDate || undefined}
								/>
							</div>
						</div>
					</div>
				) : null}

				{step === 2 ? (
					<div className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="new-sim-participants">Participants</Label>
							<TaskAssigneeFilter
								id="new-sim-participants"
								mode="multi"
								variant="field"
								value={participantIdsCsv}
								people={people}
								onChange={handleParticipantsChange}
								ariaLabel="Add simulation participants"
								triggerLabel={
									participantIds.length === 0 ? "Select participant" : undefined
								}
							/>
						</div>
						<div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
							<div className="grid grid-cols-[1fr_9.5rem_1.75rem] gap-2 border-b border-slate-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
								<span>Participant</span>
								<span>Position</span>
								<span className="sr-only">Remove</span>
							</div>
							<ul
								className={cn(
									"divide-y divide-slate-200",
									humanParticipants.length + 1 > 6 &&
										"review-hover-scroll max-h-[18rem] pr-1",
								)}
							>
								<li className="grid grid-cols-[1fr_9.5rem_1.75rem] items-center gap-2 px-3 py-2.5">
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-slate-800">
											{AI_MOCK_AUDITOR.name}
										</p>
										<p className="text-[11px] text-slate-500">
											Forensic · persona (default)
										</p>
									</div>
									<span
										className={cn(
											CAALM_BADGE_BASE,
											"justify-self-start bg-slate-100 text-slate-600 border-slate-200",
										)}
									>
										Mock auditor
									</span>
									<span className="block w-7" aria-hidden />
								</li>
								{humanParticipants.map((person) => (
									<li
										key={person.userId}
										className="grid grid-cols-[1fr_9.5rem_1.75rem] items-center gap-2 px-3 py-2.5"
									>
										<p className="truncate text-sm font-semibold text-slate-800">
											{person.name || person.userId}
										</p>
										<Select
											value={roleByUserId[person.userId] ?? "interviewee"}
											onValueChange={(value) => {
												if (
													!(HUMAN_SESSION_ROLES as readonly string[]).includes(
														value,
													)
												) {
													return;
												}
												setHumanRole(person.userId, value as HumanSessionRole);
											}}
										>
											<SelectTrigger
												aria-label={`Position for ${person.name || person.userId}`}
												className="h-8 cursor-pointer bg-white text-xs shadow-none"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{HUMAN_SESSION_ROLES.map((role) => (
													<SelectItem key={role} value={role}>
														{HUMAN_ROLE_LABELS[role]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<button
											type="button"
											className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-black/[.04] hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
											aria-label={`Remove ${person.name || person.userId}`}
											onClick={() => removeParticipant(person.userId)}
										>
											<X className="h-3.5 w-3.5" aria-hidden />
										</button>
									</li>
								))}
							</ul>
						</div>
						{humanParticipants.length === 0 ? (
							<p className="text-sm text-slate-500">
								Add people above, or continue with only the AI mock auditor.
							</p>
						) : null}
					</div>
				) : null}

				{step === 3 ? (
					<div className="space-y-4">
						{conflicts.length > 0 ? (
							<>
								<p className="text-sm text-slate-600">
									<strong className="font-semibold text-slate-800">
										{conflicts.length} participant
										{conflicts.length === 1 ? "" : "s"}
									</strong>{" "}
									{conflicts.length === 1 ? "is" : "are"} already booked on
									another simulation this week:
								</p>
								<div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
									<div className="grid grid-cols-[1fr_1.2fr] gap-2 border-b border-slate-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
										<span>Participant</span>
										<span>Conflicting simulation</span>
									</div>
									<ul className="divide-y divide-slate-200">
										{conflicts.map((conflict) => (
											<li
												key={`${conflict.participantId}-${conflict.conflictingSimulationId}-${conflict.overlapDate}`}
												className="grid grid-cols-[1fr_1.2fr] items-center gap-2 px-3 py-2.5 text-sm"
											>
												<span className="font-semibold text-slate-800">
													{conflict.participantName}
												</span>
												<div className="min-w-0 space-y-0.5">
													<span
														className={cn(
															CAALM_BADGE_BASE,
															"bg-blue/10 text-[#0f5384] border-blue/20",
														)}
													>
														{conflict.conflictingSimulationName}
													</span>
													<p className="text-[11px] text-slate-500">
														{formatOverlapDay(conflict.overlapDate)}
													</p>
												</div>
											</li>
										))}
									</ul>
								</div>
							</>
						) : (
							<p className="text-sm text-slate-600">
								No scheduling conflicts found.
							</p>
						)}
						{needsAck ? (
							<label className="flex items-start gap-2.5 text-sm font-normal text-slate-700">
								<Checkbox
									checked={ackCheck}
									onCheckedChange={(checked) => setAckCheck(checked === true)}
									className="mt-0.5 cursor-pointer"
									aria-label="I've reviewed the conflicts above and want to proceed."
								/>
								<span>
									I've reviewed the conflicts above and want to proceed.
								</span>
							</label>
						) : null}
					</div>
				) : null}

				{step === 4 ? (
					<div className="space-y-3">
						<dl className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-sm">
							<div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-2.5">
								<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
									Title
								</dt>
								<dd className="truncate text-right font-medium text-slate-700">
									{title.trim() || `${department} mock audit`}
								</dd>
							</div>
							<div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-2.5">
								<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
									Department
								</dt>
								<dd className="truncate text-right text-slate-600">
									{department}
								</dd>
							</div>
							<div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-2.5">
								<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
									Framework
								</dt>
								<dd className="truncate text-right text-slate-600">
									{framework}
								</dd>
							</div>
							{scheduledDate ? (
								<div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-2.5">
									<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
										Scheduled
									</dt>
									<dd className="truncate text-right text-slate-600">
										{formatDisplayDate(scheduledDate)}
									</dd>
								</div>
							) : null}
							{prepDeadlineDate ? (
								<div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-2.5">
									<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
										Prep by
									</dt>
									<dd className="truncate text-right text-slate-600">
										{formatDisplayDate(prepDeadlineDate)}
									</dd>
								</div>
							) : null}
							{conflicts.length > 0 ? (
								<div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-2.5">
									<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
										Conflicts
									</dt>
									<dd className="truncate text-right font-medium text-slate-700">
										{conflicts.length} acknowledged
									</dd>
								</div>
							) : null}
						</dl>

						<div
							className={cn(
								"rounded-lg border border-slate-200 bg-slate-50 px-3 py-3",
								rosterTotal > 6 && "review-hover-scroll max-h-[22rem]",
							)}
						>
							<p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
								Participants · {rosterTotal}
							</p>
							<div className="flex flex-col gap-3">
								{facilitators.length > 0 ? (
									<>
										{renderReviewRoleSection({
											title:
												facilitators.length === 1
													? "Facilitator"
													: "Facilitators",
											countBadge: facilitators.length,
											people: facilitators,
										})}
										<div className="border-t border-dashed border-slate-200" />
									</>
								) : null}
								<section className="space-y-2">
								<p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
									Mock auditor
								</p>
									<ul className="grid grid-cols-1 gap-y-2.5">
										<li className="flex min-w-0 items-center gap-2">
											<Avatar
												userId={AI_MOCK_AUDITOR.userId}
												name={AI_MOCK_AUDITOR.name || "AI auditor"}
												size="xs"
											/>
											<div className="min-w-0">
												<p className="truncate text-xs font-medium text-slate-700">
													{AI_MOCK_AUDITOR.name}
												</p>
												<p className="text-[10px] text-slate-500">
													Forensic · persona (default)
												</p>
											</div>
										</li>
									</ul>
								</section>
								{interviewees.length > 0 ? (
									<>
										<div className="border-t border-dashed border-slate-200" />
										{renderReviewRoleSection({
											title: "Interviewees",
											countBadge: interviewees.length,
											people: interviewees,
										})}
									</>
								) : null}
								{observers.length > 0 ? (
									<>
										<div className="border-t border-dashed border-slate-200" />
										{renderReviewRoleSection({
											title: observers.length === 1 ? "Observer" : "Observers",
											countBadge: observers.length,
											people: observers,
										})}
									</>
								) : null}
							</div>
						</div>
					</div>
				) : null}
			</AppDialog>

			<ConfirmDialog
				open={cancelConfirmOpen}
				onOpenChange={setCancelConfirmOpen}
				icon={<PackagePlus className="h-5 w-5" aria-hidden />}
				title="Cancel this simulation?"
				description={
					<>
						This <strong>clears your draft</strong> and closes the form. You
						cannot undo that.
					</>
				}
				confirmLabel="Clear and close"
				cancelLabel="Keep editing"
				requireStepUp={false}
				footerNote="Nothing is cleared until you confirm."
				onConfirm={confirmCancelAndClose}
			/>
		</>
	);
}
