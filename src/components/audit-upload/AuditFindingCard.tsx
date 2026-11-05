"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	ClipboardCheck,
	FileSearchCorner,
	Lighthouse,
	ListChecks,
	type LucideIcon,
	MessageSquareText,
	Minus,
	Play,
	RotateCcw,
	Shield,
	ShieldAlert,
	X,
} from "lucide-react";
import Image from "next/image";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { CapEvidenceStrip } from "@/components/audit-upload/CapEvidenceStrip";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_CELL,
} from "@/components/ui/caalm-data-table";
import {
	AppDropdownMenuContent,
	DROPDOWN_ITEM_LABEL_CLASS,
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { useCaalmAssistantShell } from "@/contexts/CaalmAssistantContext";
import type { LookedUpUser } from "@/hooks/useUsersByIds";
import {
	CAP_VERIFICATION_DRAFT_EVENT,
	getCapVerificationDraft,
} from "@/lib/assistant/cap-verification-draft";
import {
	getRemediationChatId,
	hasRemediationPlan,
	REMEDIATION_CHAT_LINK_EVENT,
} from "@/lib/assistant/remediation-chat-link";
import { slaDueAt } from "@/lib/audit-upload/caps";
import { splitFindingDescription } from "@/lib/audit-upload/split-finding-description";
import type {
	AuditCapEvidenceAttachment,
	AuditCapRecord,
	AuditCapStatus,
	AuditCapTask,
	AuditFindingRecord,
	AuditFindingStatus,
	AuditResponseStance,
	AuditSeverity,
	ControlDeficiencyType,
	ReconciliationVerdict,
} from "@/lib/audit-upload/types";
import { cn } from "@/lib/utils";

export const AUDIT_FINDINGS_TABLE_COL_SPAN = 9;

const BADGE_BASE =
	"inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";

/** CAP status → CAALM translucent badge. */
function capStatusChip(status: AuditCapStatus): {
	label: string;
	className: string;
} {
	switch (status) {
		case "open":
			return {
				label: "open",
				className: "bg-slate-100 text-slate-600 border-slate-200",
			};
		case "in_progress":
			return {
				label: "in progress",
				className: "bg-orange/10 text-orange border-orange/20",
			};
		case "pending_verification":
			return {
				label: "pending verification",
				className: "bg-blue/10 text-blue border-blue/20",
			};
		case "verified":
		case "closed":
			return {
				label: "complete",
				className: "bg-green/10 text-green border-green/20",
			};
		case "overdue":
			return {
				label: "overdue",
				className: "bg-red/10 text-red border-red/20",
			};
		case "escalated":
			return {
				label: "escalated",
				className: "bg-red/10 text-red border-red/20",
			};
		default: {
			const _exhaustive: never = status;
			return _exhaustive;
		}
	}
}

/** Finding status → CAALM translucent badge. */
function findingStatusChip(status: AuditFindingStatus): {
	label: string;
	className: string;
} {
	switch (status) {
		case "draft":
			return {
				label: "Draft",
				className: "bg-slate-100 text-slate-600 border-slate-200",
			};
		case "confirmed":
			return {
				label: "Confirmed",
				className: "bg-green/10 text-green border-green/20",
			};
		case "disputed":
			return {
				label: "Disputed",
				className: "bg-red/10 text-red border-red/20",
			};
		case "rectified":
			return {
				label: "Rectified",
				className: "bg-blue/10 text-[#0f5384] border-blue/20",
			};
		case "closed":
			return {
				label: "Closed",
				className: "bg-slate-100 text-slate-600 border-slate-200",
			};
		case "accepted_risk":
			return {
				label: "Risk accepted",
				className: "bg-orange/10 text-orange border-orange/20",
			};
		default: {
			const _exhaustive: never = status;
			return _exhaustive;
		}
	}
}

function formatCapDate(iso: string | null | undefined, prefix: string): string {
	if (!iso) return "";
	try {
		return `${prefix} ${format(new Date(iso), "MMM d, yyyy")}`;
	} catch {
		return "";
	}
}

/** Management's stance on the finding — chip tone never carries the label alone. */
const STANCE_CHIP: Record<
	AuditResponseStance,
	{ label: string; className: string; Icon: LucideIcon }
> = {
	concurs: {
		label: "Concurs",
		className: "bg-green/10 text-green border-green/20",
		Icon: Check,
	},
	partially_concurs: {
		label: "Partially concurs",
		className: "bg-orange/10 text-orange border-orange/20",
		Icon: Minus,
	},
	does_not_concur: {
		label: "Does not concur",
		className: "bg-red/10 text-red border-red/20",
		Icon: X,
	},
};

/** Action-bar hint under the required-correction panel, by CAP state. */
function correctionHint(cap: AuditCapRecord | null): string {
	if (!cap) return "CAALM can draft a corrective action from these steps.";
	if (cap.status === "verified" || cap.status === "closed") {
		const closedLabel = formatCapDate(cap.closedAt, "on");
		return closedLabel
			? `These steps were completed ${closedLabel}.`
			: "These steps were completed.";
	}
	return "A corrective action is already tracking these steps.";
}

/** Severity chip — CAALM translucent badge tokens. */
const SEVERITY_CHIP: Record<
	AuditSeverity,
	{ className: string; Icon: typeof Check }
> = {
	critical: {
		className: "bg-red/10 text-red border-red/20",
		Icon: AlertTriangle,
	},
	high: {
		className: "bg-orange/10 text-orange border-orange/20",
		Icon: AlertTriangle,
	},
	medium: {
		className: "bg-orange/10 text-orange border-orange/20",
		Icon: AlertTriangle,
	},
	low: {
		className: "bg-green/10 text-green border-green/20",
		Icon: Check,
	},
	informational: {
		className: "bg-slate-100 text-slate-600 border-slate-200",
		Icon: Check,
	},
};

const RISK_SCORE_MAX = 25;

const VERDICT_LABEL: Record<ReconciliationVerdict, string> = {
	untracked_gap: "Untracked gap",
	supported: "Supported",
	stale_readiness: "Stale readiness",
	severity_mismatch: "Severity mismatch",
	false_finding: "False finding",
	needs_human_review: "Needs human review",
};

const VERDICT_OK: Record<ReconciliationVerdict, boolean> = {
	untracked_gap: false,
	supported: true,
	stale_readiness: false,
	severity_mismatch: false,
	false_finding: true,
	needs_human_review: false,
};

const VERDICT_TONE_CLASS = {
	ok: "border-green/20 bg-green/10 text-green",
	warn: "border-orange/20 bg-orange/10 text-orange",
};

const DEFICIENCY_LABEL: Record<ControlDeficiencyType, string> = {
	material_weakness: "Material weakness",
	significant_deficiency: "Significant deficiency",
	control_deficiency: "Control deficiency",
};

function severityDisplayLabel(severity: AuditSeverity): string {
	switch (severity) {
		case "critical":
			return "Critical";
		case "high":
			return "High";
		case "medium":
			return "Medium";
		case "low":
			return "Low";
		case "informational":
			return "Informational";
		default: {
			const _exhaustive: never = severity;
			return _exhaustive;
		}
	}
}

function formatDueDate(iso: string | null | undefined): string | null {
	if (!iso) return null;
	try {
		return format(new Date(iso), "MMM d, yyyy");
	} catch {
		return null;
	}
}

/** "Overdue 3d" / "Overdue 2w" / "Overdue 4mo" for a past due date with no CAP yet. */
function overdueLabel(iso: string | null | undefined): string | null {
	if (!iso) return null;
	const due = new Date(iso);
	if (Number.isNaN(due.getTime())) return null;
	const diffMs = Date.now() - due.getTime();
	if (diffMs <= 0) return null;
	const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	if (days < 7) return `Overdue ${days}d`;
	if (days < 30) return `Overdue ${Math.floor(days / 7)}w`;
	return `Overdue ${Math.floor(days / 30)}mo`;
}

/** Coarse 3-step journey (draft/confirmed → CAP in progress → closed) for the Progress column. */
type FindingProgressStage = {
	filled: 1 | 2 | 3;
	label: string;
	/** Draft hasn't started moving yet, so its dot stays still. */
	animate?: boolean;
};

function findingProgressStage(
	finding: AuditFindingRecord,
	cap: AuditCapRecord | null,
): FindingProgressStage {
	switch (finding.status) {
		case "draft":
			return { filled: 1, label: "Draft", animate: false };
		case "disputed":
			return { filled: 1, label: "Disputed" };
		case "accepted_risk":
			return { filled: 3, label: "Risk accepted" };
		case "rectified":
			return { filled: 3, label: "Rectified" };
		case "closed":
			return { filled: 3, label: "Closed" };
		case "confirmed": {
			if (!cap) return { filled: 1, label: "Confirmed" };
			switch (cap.status) {
				case "open":
					return { filled: 1, label: "Confirmed" };
				case "in_progress":
					return { filled: 2, label: "CAP started" };
				case "pending_verification":
					return { filled: 2, label: "Awaiting evidence" };
				case "overdue":
					return { filled: 2, label: "Overdue" };
				case "escalated":
					return { filled: 2, label: "Escalated" };
				case "verified":
				case "closed":
					return { filled: 3, label: "Closed" };
				default: {
					const _exhaustive: never = cap.status;
					return _exhaustive;
				}
			}
		}
		default: {
			const _exhaustive: never = finding.status;
			return _exhaustive;
		}
	}
}

/** Dot stepper — completed steps green, current step dark blue with an animated ripple. */
function ProgressStepper({
	filled,
	label,
	animate = true,
}: FindingProgressStage) {
	const currentStep = filled - 1;
	return (
		<div className="flex flex-col items-start gap-1">
			<div className="flex items-center" aria-hidden>
				{([0, 1, 2] as const).map((step) => (
					<Fragment key={step}>
						{step > 0 ? (
							<span
								className={cn(
									"h-px w-4",
									step <= currentStep ? "bg-green" : "bg-slate-200",
								)}
							/>
						) : null}
						{step === currentStep && animate ? (
							<span className="relative inline-flex h-2 w-2 shrink-0">
								<span className="live-weather-sonar absolute inline-flex h-full w-full rounded-full bg-[#0f5384]/70" />
								<span className="live-weather-sonar live-weather-sonar-delay absolute inline-flex h-full w-full rounded-full bg-[#0f5384]/45" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-[#0f5384]" />
							</span>
						) : step === currentStep ? (
							<span className="h-2 w-2 shrink-0 rounded-full bg-[#0f5384]" />
						) : (
							<span
								className={cn(
									"h-2 w-2 shrink-0 rounded-full",
									step < currentStep
										? "bg-green"
										: "border border-slate-300 bg-white",
								)}
							/>
						)}
					</Fragment>
				))}
			</div>
			<span className="text-[11px] font-semibold text-[#0f5384]">{label}</span>
		</div>
	);
}

/** Dropdown row matching the Assign Task picker: tinted circle icon chip, bold label only on hover. */
const FINDING_MENU_DIVIDER = "mx-3 my-1 h-px bg-slate-200/40";

function FindingActionItem({
	icon: Icon,
	iconClassName,
	disabled,
	onSelect,
	children,
}: {
	icon: LucideIcon;
	iconClassName: string;
	disabled?: boolean;
	onSelect: () => void;
	children: ReactNode;
}) {
	return (
		<DropdownMenuItem
			className="cursor-pointer gap-2"
			disabled={disabled}
			onSelect={onSelect}
		>
			<span
				className={cn(
					"flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
					iconClassName,
				)}
			>
				<Icon className="h-3.5 w-3.5" aria-hidden />
			</span>
			<span className={cn("flex-1", DROPDOWN_ITEM_LABEL_CLASS)}>
				{children}
			</span>
		</DropdownMenuItem>
	);
}

/** One row in the corrective action's task list — real checkbox, evidence chip is informational only. */
function CapTaskRow({
	task,
	disabled,
	onToggle,
}: {
	task: AuditCapTask;
	disabled: boolean;
	onToggle: () => void;
}) {
	const checkboxId = `cap-task-${task.id}`;
	const hasEvidence = task.evidenceIds.length > 0;
	return (
		<li className="flex items-start gap-2.5">
			<input
				id={checkboxId}
				type="checkbox"
				checked={task.done}
				disabled={disabled}
				onChange={onToggle}
				className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-[#0f5384] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#078fab] disabled:cursor-not-allowed"
			/>
			<label
				htmlFor={checkboxId}
				className={cn(
					"min-w-0 flex-1 text-sm leading-relaxed",
					disabled ? "cursor-not-allowed" : "cursor-pointer",
					task.done ? "text-slate-400 line-through" : "text-slate-700",
				)}
			>
				{task.text}
			</label>
			{hasEvidence ? (
				<span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
					{task.evidenceIds.length}{" "}
					{task.evidenceIds.length === 1 ? "file" : "files"}
				</span>
			) : task.requiresEvidence ? (
				<span className="shrink-0 rounded-full border border-orange/20 bg-orange/10 px-2 py-0.5 text-[10px] font-semibold text-orange">
					Evidence needed
				</span>
			) : null}
		</li>
	);
}

function nextStepForVerdict(
	verdict: ReconciliationVerdict | null,
	readinessIds: string[],
): string {
	switch (verdict) {
		case "untracked_gap":
			return "Confirming will draft a corrective action and prompt you to create a readiness item.";
		case "supported": {
			const id = readinessIds[0];
			return id
				? `Confirming will link the corrective action to ${id}.`
				: "Confirming will link the corrective action to the matched readiness item.";
		}
		case "stale_readiness":
			return "Confirming will flag the readiness item for update.";
		case "severity_mismatch":
			return "Confirming will flag the severity discrepancy for the readiness item owner.";
		case "false_finding":
			return "Confirming records agreement that readiness already covers this item.";
		case "needs_human_review":
			return "Review the match carefully before confirming or disputing.";
		case null:
			return "Confirming records your decision once reconciliation finishes.";
		default: {
			const _exhaustive: never = verdict;
			return _exhaustive;
		}
	}
}

const SECTION_LABEL =
	"text-[11px] font-semibold uppercase tracking-wide text-slate-500";

const META_LABEL =
	"text-[10px] font-semibold uppercase tracking-wide text-slate-500";

/** Cut footer / appendix pollution that sometimes trails a management reply. */
function cleanManagementResponse(raw: string): string {
	let text = raw.trim().replace(/^Management\s+response:\s*/i, "");
	const cut = text.search(
		/(?:Confidential\s+Page\s+\d+|Appendix\s+[A-Z]\b|Schedule of Expenditures|This sample report\b|\n(?:F-\d{2}|20\d{2}-\d{3})\s+[—–-])/i,
	);
	if (cut >= 40) {
		text = text.slice(0, cut).trim();
	}
	return text.replace(/\s+/g, " ").trim();
}

/** Split long prose into short readable paragraphs (not one OCR blob). */
function proseParagraphs(raw: string): string[] {
	const normalized = raw.replace(/\r\n/g, "\n").trim();
	if (!normalized) return [];

	const byBlank = normalized
		.split(/\n\n+/)
		.map((part) => part.replace(/\s+/g, " ").trim())
		.filter(Boolean);
	if (byBlank.length > 1) return byBlank;

	const single = byBlank[0] ?? normalized.replace(/\s+/g, " ");
	const sentences = single
		.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
		?.map((s) => s.trim()) ?? [single];

	const paragraphs: string[] = [];
	let buffer = "";
	for (const sentence of sentences) {
		const next = buffer ? `${buffer} ${sentence}` : sentence;
		if (buffer && next.length > 220) {
			paragraphs.push(buffer);
			buffer = sentence;
		} else {
			buffer = next;
		}
	}
	if (buffer) paragraphs.push(buffer);
	return paragraphs;
}

/** Table row for one finding, plus its expandable detail row. */
export function AuditFindingCard({
	finding,
	cap = null,
	repeatOfCode,
	detailsOpen,
	passageOpen,
	busy,
	canManageFindings,
	canManageCaps = false,
	onToggleDetails,
	onTogglePassage,
	onConfirm,
	onDispute,
	onRectify,
	onAcceptRisk,
	onStartCap,
	onCloseCap,
	onCreateCap,
	onEvidenceUploaded,
	ownerUser = null,
	onToggleTask,
}: {
	finding: AuditFindingRecord;
	cap?: AuditCapRecord | null;
	repeatOfCode: string | null;
	detailsOpen: boolean;
	passageOpen: boolean;
	busy: boolean;
	canManageFindings: boolean;
	canManageCaps?: boolean;
	onToggleDetails: () => void;
	onTogglePassage: () => void;
	onConfirm: () => void;
	onDispute: () => void;
	onRectify: () => void;
	onAcceptRisk: () => void;
	onStartCap?: () => void;
	onCloseCap?: () => void;
	onCreateCap?: () => void;
	onEvidenceUploaded?: (attachments: AuditCapEvidenceAttachment[]) => void;
	/** The CAP's assignee, resolved — null when unassigned or not yet loaded. */
	ownerUser?: LookedUpUser | null;
	onToggleTask?: (taskId: string) => void;
}) {
	const verdict = finding.reconciliation?.verdict ?? null;
	const readinessIds = finding.reconciliation?.matchedRequirementIds ?? [];
	const drawerId = `finding-drawer-${finding.$id}`;
	const correctiveActionSectionId = `finding-cap-${finding.$id}`;
	const { conditionText, correctiveText } = splitFindingDescription(
		finding.description,
	);
	const {
		startAuditRemediationGuide,
		openRemediationChat,
		canChat,
		permissionsLoading,
		isGuiding,
	} = useCaalmAssistantShell();
	/** Falls back to the unsplit "how to correct" text for findings extracted before obligations existed. */
	const obligations =
		finding.correctionObligations.length > 0
			? finding.correctionObligations
			: correctiveText
				? [correctiveText]
				: [];
	const showMeHow = obligations.length > 0 && !permissionsLoading && canChat;
	const stanceChip = finding.responseStance
		? STANCE_CHIP[finding.responseStance]
		: null;
	const responseCommittedLabel = formatDueDate(finding.responseCommittedDate);
	const hasResponseMeta = Boolean(
		responseCommittedLabel ||
			finding.responseAuditor ||
			finding.responseSourceRef,
	);
	const [hasRemediationChat, setHasRemediationChat] = useState(false);
	const [hasPlan, setHasPlan] = useState(false);
	const [verificationDraft, setVerificationDraft] = useState<string | null>(
		null,
	);

	useEffect(() => {
		const sync = () => {
			setHasRemediationChat(Boolean(getRemediationChatId(finding.$id)));
			setHasPlan(hasRemediationPlan(finding.$id));
		};
		sync();
		window.addEventListener(REMEDIATION_CHAT_LINK_EVENT, sync);
		return () => window.removeEventListener(REMEDIATION_CHAT_LINK_EVENT, sync);
	}, [finding.$id, detailsOpen, cap?.status, cap?.$id]);

	useEffect(() => {
		if (!cap?.$id) {
			setVerificationDraft(null);
			return;
		}
		const syncDraft = () => {
			setVerificationDraft(getCapVerificationDraft(cap.$id));
		};
		syncDraft();
		window.addEventListener(CAP_VERIFICATION_DRAFT_EVENT, syncDraft);
		return () =>
			window.removeEventListener(CAP_VERIFICATION_DRAFT_EVENT, syncDraft);
	}, [cap?.$id]);

	const isConfirmed = finding.status === "confirmed";
	const isDraft = finding.status === "draft";
	const capChip = cap ? capStatusChip(cap.status) : null;
	const statusChip = findingStatusChip(finding.status);
	const capDone = cap?.status === "closed" || cap?.status === "verified";
	const capClosedLabel = cap?.closedAt
		? formatCapDate(cap.closedAt, "Closed")
		: null;

	const citationChip = finding.frameworkRefs.length
		? finding.frameworkRefs.join(", ")
		: null;

	const severityChip = SEVERITY_CHIP[finding.severityComputed];
	const SeverityIcon = severityChip.Icon;
	const riskPct = Math.min(
		100,
		Math.round((finding.riskScore / RISK_SCORE_MAX) * 100),
	);
	/** Prefer the CAP due date; otherwise show severity SLA so the cell is never empty. */
	const dueIso =
		cap?.dueAt ??
		slaDueAt(
			finding.severityComputed,
			finding.$createdAt ? new Date(finding.$createdAt) : undefined,
		);
	const dueLabel = formatDueDate(dueIso);
	/** Only call out overdue here when no CAP exists yet — an existing CAP tracks its own overdue state. */
	const overdueText = !cap ? overdueLabel(dueIso) : null;

	return (
		<>
			<TableRow
				tabIndex={0}
				className={cn(DATA_TABLE_BODY_ROW_CLICKABLE, "align-top")}
				onClick={onToggleDetails}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onToggleDetails();
					}
				}}
				aria-expanded={detailsOpen}
				aria-controls={drawerId}
			>
				{/* Id */}
				<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap pl-4")}>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							aria-label={detailsOpen ? "Hide details" : "Show details"}
							aria-expanded={detailsOpen}
							aria-controls={drawerId}
							onClick={(event) => {
								event.stopPropagation();
								onToggleDetails();
							}}
							className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:text-slate-600"
						>
							<ChevronRight
								className={cn(
									"h-4 w-4 transition-transform",
									detailsOpen && "rotate-90",
								)}
								aria-hidden
							/>
						</button>
						{finding.findingCode ? (
							<span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-green/20 bg-green/10 px-2 py-0.5 font-mono text-xs font-semibold text-[#0f5384]">
								{finding.findingCode}
							</span>
						) : (
							<span className="text-xs text-slate-400">—</span>
						)}
					</div>
				</TableCell>

				{/* Severity */}
				<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
					<span className={cn(BADGE_BASE, severityChip.className)}>
						<SeverityIcon className="h-3.5 w-3.5" aria-hidden />
						{severityDisplayLabel(finding.severityComputed)}
					</span>
				</TableCell>

				{/* Risk */}
				<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
					<div className="flex items-center gap-2">
						<div
							className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200"
							role="meter"
							aria-valuenow={finding.riskScore}
							aria-valuemin={0}
							aria-valuemax={RISK_SCORE_MAX}
							aria-label={`Risk score ${finding.riskScore} of ${RISK_SCORE_MAX}`}
						>
							<div
								className="h-full rounded-full bg-[#0f5384]"
								style={{ width: `${riskPct}%` }}
							/>
						</div>
						<span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">
							{finding.riskScore}/{RISK_SCORE_MAX}
						</span>
					</div>
				</TableCell>

				{/* History */}
				<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
					{finding.isRepeat ? (
						<span className="inline-flex items-center gap-1 rounded-full border border-blue/20 bg-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#0f5384]">
							<RotateCcw className="h-3 w-3" aria-hidden />
							Repeat{repeatOfCode ? ` · ${repeatOfCode}` : ""}
						</span>
					) : (
						<span className="text-xs text-slate-400">—</span>
					)}
				</TableCell>

				{/* Classification */}
				<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
					{finding.controlDeficiencyType ? (
						<span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
							<Shield className="h-3 w-3 text-[#0f5384]" aria-hidden />
							{DEFICIENCY_LABEL[finding.controlDeficiencyType]}
						</span>
					) : (
						<span className="text-xs text-slate-400">—</span>
					)}
				</TableCell>

				{/* Status */}
				<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
					<span className={cn(BADGE_BASE, statusChip.className)}>
						{statusChip.label}
					</span>
				</TableCell>

				{/* Progress */}
				<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
					<ProgressStepper {...findingProgressStage(finding, cap)} />
				</TableCell>

				{/* Due */}
				<TableCell className={cn(DATA_TABLE_CELL, "whitespace-nowrap")}>
					{overdueText ? (
						<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red">
							<Calendar className="h-3.5 w-3.5 text-red" aria-hidden />
							{overdueText}
						</span>
					) : dueLabel ? (
						<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
							<Calendar className="h-3.5 w-3.5 text-[#078fab]" aria-hidden />
							{dueLabel}
						</span>
					) : (
						<span className="text-xs text-slate-400">—</span>
					)}
				</TableCell>

				{/* Actions */}
				<TableCell
					className={cn(DATA_TABLE_CELL, "pr-4 text-right")}
					onClick={(event) => event.stopPropagation()}
				>
					{canManageFindings && isDraft ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								className="shad-no-focus rounded-full transition-colors hover:bg-white/30"
								aria-label="Finding actions"
							>
								<Image
									src="/assets/icons/dots.svg"
									alt="actions"
									width={28}
									height={28}
								/>
							</DropdownMenuTrigger>
							<AppDropdownMenuContent align="end" className="w-56 min-w-0">
								<DropdownMenuLabel className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
									What would you like to do?
								</DropdownMenuLabel>
								<div className={FINDING_MENU_DIVIDER} />
								<FindingActionItem
									icon={Check}
									iconClassName="bg-blue/15 text-[#0f5384]"
									disabled={busy}
									onSelect={onConfirm}
								>
									Confirm finding
								</FindingActionItem>
								<FindingActionItem
									icon={X}
									iconClassName="bg-slate-200/70 text-slate-700"
									disabled={busy}
									onSelect={onDispute}
								>
									Dispute
								</FindingActionItem>
								<FindingActionItem
									icon={ClipboardCheck}
									iconClassName="bg-[#078fab]/15 text-[#078fab]"
									disabled={busy}
									onSelect={onRectify}
								>
									Mark rectified
								</FindingActionItem>
								<FindingActionItem
									icon={ShieldAlert}
									iconClassName="bg-orange/15 text-orange"
									disabled={busy}
									onSelect={onAcceptRisk}
								>
									Accept risk
								</FindingActionItem>
								<div className={FINDING_MENU_DIVIDER} />
								<p className="px-3 py-2 text-xs text-slate-500">
									<span className="font-semibold text-slate-700">
										Next step:
									</span>{" "}
									{nextStepForVerdict(verdict, readinessIds)}
								</p>
							</AppDropdownMenuContent>
						</DropdownMenu>
					) : capChip ? (
						<span className={cn(BADGE_BASE, capChip.className)}>
							{capChip.label}
						</span>
					) : null}
				</TableCell>
			</TableRow>

			{/* Detail drawer row */}
			{detailsOpen ? (
				<TableRow
					id={drawerId}
					className="border-b-0 hover:bg-transparent hover:shadow-none"
				>
					<TableCell
						colSpan={AUDIT_FINDINGS_TABLE_COL_SPAN}
						className="border-t border-slate-200/80 bg-slate-50/60 p-0"
					>
						<div className="space-y-4 p-4 sm:p-5">
							{/* Reconciliation verdict — sized to its content, centered like a title */}
							<div
								role="group"
								aria-label="Reconciliation verdict"
								className={cn(
									"mx-auto flex w-fit max-w-full items-start gap-2 rounded-lg border px-3 py-2 text-sm",
									verdict
										? VERDICT_TONE_CLASS[VERDICT_OK[verdict] ? "ok" : "warn"]
										: "border-slate-200 bg-white text-slate-500",
								)}
							>
								{verdict ? (
									VERDICT_OK[verdict] ? (
										<CheckCircle2
											className="mt-0.5 h-4 w-4 shrink-0"
											aria-hidden
										/>
									) : (
										<AlertTriangle
											className="mt-0.5 h-4 w-4 shrink-0"
											aria-hidden
										/>
									)
								) : null}
								<p>
									{verdict ? (
										<span className="font-bold">{VERDICT_LABEL[verdict]}</span>
									) : (
										<span className="font-bold">Not reconciled</span>
									)}{" "}
									—{" "}
									{finding.reconciliation?.rationale ??
										"Not compared to readiness yet."}
									{finding.reconciliation?.matchedRequirementIds.map((code) => (
										<code
											key={code}
											className="ml-1 rounded bg-white/70 px-1 py-0.5 font-mono text-xs"
										>
											{code}
										</code>
									))}
								</p>
							</div>

							<section aria-label="Finding text">
								<p className={SECTION_LABEL}>Finding</p>
								<div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-700">
									{proseParagraphs(conditionText || finding.description).map(
										(paragraph, index) => (
											<p key={`${finding.$id}-p-${index}`}>{paragraph}</p>
										),
									)}
								</div>
							</section>

							{/* Required correction — forward-looking directive, severity-independent accent */}
							{obligations.length > 0 ? (
								<section
									aria-labelledby={`${finding.$id}-correction-label`}
									className="mt-4 overflow-hidden rounded-lg border border-slate-200/80 border-l-4 border-l-[#0f5384] bg-white"
								>
									<div className="flex items-center gap-2 px-3 pt-3 sm:px-4">
										<span
											className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0f5384]/10 text-[#0f5384]"
											aria-hidden
										>
											<ListChecks className="h-3.5 w-3.5" />
										</span>
										<h4
											id={`${finding.$id}-correction-label`}
											className={SECTION_LABEL}
										>
											Required correction
										</h4>
										{obligations.length > 1 ? (
											<span
												className="ml-auto shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
												aria-hidden
											>
												{obligations.length} obligations
											</span>
										) : null}
									</div>
									<ol className="list-none space-y-2 px-3 pb-3 pt-2 sm:px-4 [counter-reset:obligation]">
										{obligations.map((item, index) => (
											<li
												key={`${finding.$id}-oblig-${index}`}
												className="flex gap-2.5 text-sm leading-relaxed text-slate-700 [counter-increment:obligation]"
											>
												<span
													className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0f5384]/10 text-[11px] font-bold text-[#0f5384] before:content-[counter(obligation)]"
													aria-hidden
												/>
												<span className="min-w-0 flex-1">{item}</span>
											</li>
										))}
									</ol>
									<div className="flex items-center gap-3 border-t border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-4">
										<p className="min-w-0 flex-1 text-xs text-slate-500">
											{correctionHint(cap)}
										</p>
										{showMeHow && hasRemediationChat && hasPlan ? (
											<Button
												type="button"
												className="btn-primary shrink-0 px-3 sm:px-4"
												disabled={busy || isGuiding}
												aria-label={`Review the corrective action plan for ${finding.findingCode || finding.title}`}
												onClick={() => void openRemediationChat(finding.$id)}
											>
												<FileSearchCorner className="h-3.5 w-3.5" />
												Review the plan
											</Button>
										) : showMeHow ? (
											<Button
												type="button"
												className="btn-primary shrink-0 px-3 sm:px-4"
												disabled={busy || isGuiding}
												aria-label={`Show me how to correct ${finding.findingCode || finding.title}`}
												onClick={() =>
													void startAuditRemediationGuide({
														findingId: finding.$id,
														documentId: finding.documentId,
														findingCode: finding.findingCode,
														findingTitle: finding.title,
													})
												}
											>
												<Lighthouse className="h-3.5 w-3.5" />
												Show me how
											</Button>
										) : null}
									</div>
								</section>
							) : null}

							{/* Management response — attributed historical testimony, never styled as a directive */}
							{finding.managementResponse ? (
								<section
									aria-labelledby={`${finding.$id}-response-label`}
									className="mt-4 rounded-lg border border-slate-200/80 bg-white px-3 py-3 sm:px-4"
								>
									<div className="flex items-center gap-2">
										<h4
											id={`${finding.$id}-response-label`}
											className={SECTION_LABEL}
										>
											Management response
										</h4>
										{stanceChip ? (
											<span
												className={cn(
													BADGE_BASE,
													"ml-auto shrink-0",
													stanceChip.className,
												)}
											>
												<stanceChip.Icon className="h-3.5 w-3.5" aria-hidden />
												{stanceChip.label}
											</span>
										) : null}
									</div>
									<blockquote className="mt-2 space-y-2 border-l-[3px] border-slate-200 pl-3 text-sm italic leading-relaxed text-slate-600">
										{proseParagraphs(
											cleanManagementResponse(finding.managementResponse),
										).map((paragraph, index) => (
											<p key={`${finding.$id}-mgmt-${index}`}>{paragraph}</p>
										))}
									</blockquote>
									{hasResponseMeta ? (
										<dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200/80 pt-3">
											{responseCommittedLabel ? (
												<div>
													<dt className={META_LABEL}>Committed by</dt>
													<dd className="text-xs text-slate-700">
														{responseCommittedLabel}
													</dd>
												</div>
											) : null}
											{finding.responseAuditor ? (
												<div>
													<dt className={META_LABEL}>Auditor</dt>
													<dd className="text-xs text-slate-700">
														{finding.responseAuditor}
													</dd>
												</div>
											) : null}
											{finding.responseSourceRef ? (
												<div>
													<dt className={META_LABEL}>Source reference</dt>
													<dd className="font-mono text-xs text-slate-700">
														{finding.responseSourceRef}
													</dd>
												</div>
											) : null}
										</dl>
									) : null}
								</section>
							) : null}

							<section
								aria-label="Source"
								className="border-t border-slate-200/80 pt-4"
							>
								<p className={SECTION_LABEL}>Source</p>
								<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
									<span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-slate-600">
										{Math.round(finding.confidence * 100)}% confidence
									</span>
									{citationChip ? (
										<span className="inline-flex items-center rounded-full border border-[#a0c4db] bg-[#e1f3ff] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#0f5384]">
											{citationChip}
										</span>
									) : null}
									{finding.citations.length > 0 ? (
										<button
											type="button"
											aria-expanded={passageOpen}
											onClick={onTogglePassage}
											className="cursor-pointer font-semibold text-[#078fab] hover:underline"
										>
											{passageOpen ? "Hide passage ↑" : "Show passage ↓"}
										</button>
									) : null}
								</div>
								{passageOpen && finding.citations.length > 0 ? (
									<div className="mt-3 space-y-2">
										{finding.citations.map((citation) => (
											<blockquote
												key={`${citation.quote}-${citation.page}`}
												className="border-l-[3px] border-slate-300 pl-3 text-sm italic leading-relaxed text-slate-600"
											>
												“
												{citation.quote.length > 600
													? `${citation.quote.slice(0, 600)}…`
													: citation.quote}
												”{citation.page ? ` (p. ${citation.page})` : ""}
												{citation.matched ? "" : " — quote not found in file"}
											</blockquote>
										))}
									</div>
								) : null}
							</section>

							<section
								id={correctiveActionSectionId}
								tabIndex={-1}
								aria-labelledby={`${correctiveActionSectionId}-label`}
								className="scroll-mt-4 border-t border-slate-200/80 pt-4 outline-none"
							>
								<p
									id={`${correctiveActionSectionId}-label`}
									className={SECTION_LABEL}
								>
									Corrective action
								</p>
								{cap ? (
									<div
										role="region"
										aria-label="Corrective action plan"
										className="mt-2 overflow-hidden rounded-lg border border-[#a0c4db]/60 bg-[#e1f3ff]/30"
									>
										{/* Zone 1 — header */}
										<div className="space-y-3 px-3 py-3 sm:px-4">
											<h4 className="text-sm font-semibold text-[#0f5384]">
												{cap.title}
											</h4>
											<dl className="flex flex-wrap gap-x-6 gap-y-2">
												{cap.rootCause ? (
													<div>
														<dt className={META_LABEL}>Root cause</dt>
														<dd className="text-xs text-slate-700">
															{cap.rootCause.replaceAll("_", " ")}
														</dd>
													</div>
												) : null}
												{cap.verificationEvidence || verificationDraft ? (
													<div className="min-w-0 flex-1 basis-full">
														<dt className={META_LABEL}>Verification note</dt>
														<dd className="text-xs leading-relaxed text-slate-700">
															{cap.verificationEvidence ??
																verificationDraft ??
																""}
															{!cap.verificationEvidence && verificationDraft ? (
																<span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
																	(Draft — save Mark closed to record)
																</span>
															) : null}
														</dd>
													</div>
												) : null}
											</dl>
										</div>

										{/* Zone 2 — task list */}
										{cap.tasks.length > 0 ? (
											<ul className="space-y-1.5 border-t border-slate-200/80 px-3 py-3 sm:px-4">
												{cap.tasks.map((task) => (
													<CapTaskRow
														key={task.id}
														task={task}
														disabled={!canManageCaps || capDone || busy}
														onToggle={() => onToggleTask?.(task.id)}
													/>
												))}
											</ul>
										) : null}

										{/* Zone 3 — evidence */}
										<div className="space-y-2 border-t border-slate-200/80 px-3 py-3 sm:px-4">
											<p className={META_LABEL}>
												Evidence ·{" "}
												{cap.evidenceAttachments.length === 0
													? "no files"
													: `${cap.evidenceAttachments.length} ${cap.evidenceAttachments.length === 1 ? "file" : "files"}`}
											</p>
											<CapEvidenceStrip
												capId={cap.$id}
												attachments={cap.evidenceAttachments ?? []}
												layout="compact"
												size="xl"
												maxFiles={10}
												canUpload={Boolean(canManageCaps) && !capDone}
												canDelete={Boolean(canManageCaps) && !capDone}
												onUploaded={onEvidenceUploaded}
												onDeleted={onEvidenceUploaded}
											/>
										</div>

										{/* Zone 4 — footer */}
										<div
											aria-live="polite"
											className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-4"
										>
											{capDone ? (
												<p className="flex items-center gap-1.5 text-xs font-semibold text-green">
													<Check className="h-3.5 w-3.5" aria-hidden />
													{capClosedLabel ?? "Closed"}
												</p>
											) : (
												<>
													<p
														id={`${correctiveActionSectionId}-hint`}
														className="min-w-0 flex-1 text-xs text-slate-500"
													>
														{cap.closeBlocker ??
															"All tasks complete. Ready to close."}
													</p>
													{canChat ? (
														<Button
															type="button"
															className="btn-primary shrink-0 px-3 sm:px-4"
															disabled={busy || isGuiding}
															aria-label="Open Ask CAALM chat for this finding"
															onClick={() => {
																if (!getRemediationChatId(finding.$id)) {
																	setHasRemediationChat(false);
																}
																void openRemediationChat(finding.$id);
															}}
														>
															<MessageSquareText className="h-3.5 w-3.5" />
															Ask CAALM
														</Button>
													) : null}
													{canManageCaps && onCloseCap ? (
														<Button
															type="button"
															className="btn-primary shrink-0 px-3 sm:px-4"
															disabled={busy || !cap.canClose}
															aria-describedby={`${correctiveActionSectionId}-hint`}
															aria-label="Mark closed"
															onClick={onCloseCap}
														>
															<Check className="h-3.5 w-3.5" />
															Mark closed
														</Button>
													) : null}
												</>
											)}
										</div>

										{canManageCaps && cap.status === "open" && onStartCap ? (
											<div className="border-t border-slate-200/80 px-3 py-2.5 sm:px-4">
												<Button
													type="button"
													className="btn-primary w-full"
													disabled={busy}
													aria-label="Start corrective action"
													onClick={onStartCap}
												>
													<Play className="h-3.5 w-3.5" />
													Start
												</Button>
											</div>
										) : null}
									</div>
								) : (
									<div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center">
										<p className="text-sm text-slate-600">
											{isConfirmed
												? "No corrective action yet. Create one to track remediation."
												: "Confirming this finding can draft a corrective action automatically."}
										</p>
										{canManageCaps && isConfirmed && onCreateCap ? (
											<Button
												type="button"
												variant="outline"
												className="mt-3 h-8 border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50"
												disabled={busy}
												onClick={onCreateCap}
											>
												Create corrective action
											</Button>
										) : null}
									</div>
								)}
							</section>
						</div>
					</TableCell>
				</TableRow>
			) : null}
		</>
	);
}
