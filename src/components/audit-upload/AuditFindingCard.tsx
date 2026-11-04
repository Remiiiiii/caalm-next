"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	Calendar,
	Check,
	CheckCircle2,
	ClipboardCheck,
	Play,
	RotateCcw,
	Shield,
	ShieldAlert,
	Sparkles,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CapEvidenceStrip } from "@/components/audit-upload/CapEvidenceStrip";
import { Button } from "@/components/ui/button";
import { useCaalmAssistantShell } from "@/contexts/CaalmAssistantContext";
import {
	getRemediationChatId,
	REMEDIATION_CHAT_LINK_EVENT,
} from "@/lib/assistant/remediation-chat-link";
import { slaDueAt } from "@/lib/audit-upload/caps";
import { splitFindingDescription } from "@/lib/audit-upload/split-finding-description";
import type {
	AuditCapEvidenceAttachment,
	AuditCapRecord,
	AuditCapStatus,
	AuditFindingRecord,
	AuditSeverity,
	ControlDeficiencyType,
	ReconciliationVerdict,
} from "@/lib/audit-upload/types";
import { cn } from "@/lib/utils";

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

function formatCapDate(iso: string | null | undefined, prefix: string): string {
	if (!iso) return "";
	try {
		return `${prefix} ${format(new Date(iso), "MMM d, yyyy")}`;
	} catch {
		return "";
	}
}

/** Card left-border accent — CAALM severity tokens. */
const SEVERITY_ACCENT: Record<AuditSeverity, string> = {
	critical: "border-l-red",
	high: "border-l-orange",
	medium: "border-l-orange",
	low: "border-l-green",
	informational: "border-l-slate-300",
};

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

const META_LABEL =
	"text-[10px] font-semibold uppercase tracking-wide text-slate-500";

/** Attribute cell with a light divider between columns on desktop. */
const META_CELL =
	"min-w-0 space-y-1.5 py-0.5 sm:border-l sm:border-slate-200/80 sm:px-4 sm:[&:nth-child(5n+1)]:border-l-0 sm:[&:nth-child(5n+1)]:pl-0 sm:[&:nth-child(5n+1)]:pr-4";

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

const ACTION_BTN = "btn-primary w-full justify-center px-3 sm:px-4";

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
	const showHowToCorrect = Boolean(correctiveText);
	const showMeHow =
		showHowToCorrect && !permissionsLoading && canChat;
	const [hasRemediationChat, setHasRemediationChat] = useState(false);

	useEffect(() => {
		const sync = () => {
			setHasRemediationChat(Boolean(getRemediationChatId(finding.$id)));
		};
		sync();
		window.addEventListener(REMEDIATION_CHAT_LINK_EVENT, sync);
		return () => window.removeEventListener(REMEDIATION_CHAT_LINK_EVENT, sync);
	}, [finding.$id, detailsOpen, cap?.status, cap?.$id]);

	const openCorrectiveActionSection = () => {
		const wasOpen = detailsOpen;
		if (!wasOpen) onToggleDetails();
		window.requestAnimationFrame(() => {
			window.setTimeout(
				() => {
					const el = document.getElementById(correctiveActionSectionId);
					el?.scrollIntoView({ behavior: "smooth", block: "start" });
					el?.focus({ preventScroll: true });
				},
				wasOpen ? 50 : 220,
			);
		});
	};
	const isConfirmed = finding.status === "confirmed";
	const isDraft = finding.status === "draft";
	const capChip = cap ? capStatusChip(cap.status) : null;
	const capDateLabel = cap
		? cap.status === "closed" || cap.closedAt
			? formatCapDate(cap.closedAt, "Closed")
			: formatCapDate(cap.dueAt, "Due")
		: "";

	const displayTitle = finding.findingCode
		? finding.title.replace(
				new RegExp(
					`^${finding.findingCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[—-]\\s*`,
				),
				"",
			)
		: finding.title;

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
	const dueLabel = formatDueDate(
		cap?.dueAt ??
			slaDueAt(
				finding.severityComputed,
				finding.$createdAt ? new Date(finding.$createdAt) : undefined,
			),
	);

	return (
		<article
			id={`finding-${finding.$id}`}
			className={cn(
				"overflow-hidden rounded-lg border border-slate-200/80 border-l-4 bg-white/80 shadow-sm",
				SEVERITY_ACCENT[finding.severityComputed],
			)}
		>
			{/* Split header: wide identity | narrow actions */}
			<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_27rem]">
				{/* Left panel — identity + attribute grid */}
				<div className="min-w-0 space-y-3 p-4 sm:p-5">
					<div className="flex items-start gap-2.5">
						{finding.findingCode ? (
							<span
								aria-label={`Finding ${finding.findingCode}`}
								className="mt-0.5 inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-green/20 bg-green/10 px-2 py-0.5 font-mono text-xs font-semibold text-[#0f5384]"
							>
								{finding.findingCode}
							</span>
						) : null}
						<h3 className="min-w-0 text-sm font-semibold text-slate-700">
							{displayTitle}
						</h3>
					</div>

					<div
						className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,1.4fr)_minmax(0,0.85fr)_minmax(0,1.1fr)] lg:gap-x-0"
						aria-label="Finding attributes"
					>
						<div className={META_CELL}>
							<p className={META_LABEL}>Severity</p>
							<span className={cn(BADGE_BASE, severityChip.className)}>
								<SeverityIcon className="h-3.5 w-3.5" aria-hidden />
								{severityDisplayLabel(finding.severityComputed)}
							</span>
						</div>

						<div className={META_CELL}>
							<p className={META_LABEL}>Risk score</p>
							<div className="flex items-center gap-2">
								<div
									className="h-1.5 min-w-[2.5rem] flex-1 overflow-hidden rounded-full bg-slate-200"
									role="meter"
									aria-valuenow={finding.riskScore}
									aria-valuemin={0}
									aria-valuemax={RISK_SCORE_MAX}
									aria-label={`Risk score ${finding.riskScore} of ${RISK_SCORE_MAX}`}
								>
									<div
										className="h-full rounded-full bg-[#078fab]"
										style={{ width: `${riskPct}%` }}
									/>
								</div>
								<span className="shrink-0 text-xs font-semibold tabular-nums text-slate-700">
									{finding.riskScore} / {RISK_SCORE_MAX}
								</span>
							</div>
						</div>

						<div className={META_CELL}>
							<p className={META_LABEL}>Classification</p>
							{finding.controlDeficiencyType ? (
								<span
									className={cn(
										BADGE_BASE,
										"max-w-full whitespace-normal break-words leading-snug",
										"border-slate-200 bg-slate-100 text-slate-700",
									)}
								>
									<Shield
										className="h-3.5 w-3.5 shrink-0 text-[#0f5384]"
										aria-hidden
									/>
									<span className="min-w-0">
										{DEFICIENCY_LABEL[finding.controlDeficiencyType]}
									</span>
								</span>
							) : (
								<span className="text-xs text-slate-400">—</span>
							)}
						</div>

						<div className={META_CELL}>
							<p className={META_LABEL}>History</p>
							{finding.isRepeat ? (
								<span
									className={cn(
										BADGE_BASE,
										"max-w-full whitespace-normal break-words leading-snug",
										"border-blue/20 bg-blue/10 text-[#0f5384]",
									)}
								>
									<RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
									<span className="min-w-0">
										Repeat
										{repeatOfCode ? ` · ${repeatOfCode}` : ""}
									</span>
								</span>
							) : (
								<span className="text-xs font-medium text-slate-700">
									First occurrence
								</span>
							)}
						</div>

						<div className={META_CELL}>
							<p className={META_LABEL}>Corrective action due</p>
							{dueLabel ? (
								<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
									<Calendar
										className="h-3.5 w-3.5 text-[#078fab]"
										aria-hidden
									/>
									{dueLabel}
								</span>
							) : (
								<span className="text-xs text-slate-400">—</span>
							)}
						</div>
					</div>

					{/* Reconciliation verdict — do not alter appearance / ARIA */}
					<div className="border-t border-slate-200/80 pt-3">
						<div
							role="group"
							aria-label="Reconciliation verdict"
							className={cn(
								"flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
								verdict
									? VERDICT_TONE_CLASS[VERDICT_OK[verdict] ? "ok" : "warn"]
									: "border-slate-200 bg-slate-50 text-slate-500",
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
					</div>
				</div>

				{/* Right panel — actions / CAP summary */}
				<div className="flex min-h-full flex-col gap-3 border-t border-slate-200/80 bg-slate-50/80 p-4 sm:p-5 lg:border-l lg:border-t-0">
					<p className={SECTION_LABEL}>Actions</p>

					{canManageFindings && isDraft ? (
						<>
							<div className="flex flex-col gap-2">
								<Button
									type="button"
									className={ACTION_BTN}
									disabled={busy}
									onClick={onConfirm}
								>
									<Check className="h-4 w-4" />
									Confirm finding
								</Button>
								<Button
									type="button"
									className={ACTION_BTN}
									disabled={busy}
									onClick={onDispute}
								>
									<X className="h-4 w-4" />
									Dispute
								</Button>
								<Button
									type="button"
									className={ACTION_BTN}
									disabled={busy}
									onClick={onRectify}
								>
									<ClipboardCheck className="h-4 w-4" />
									Mark rectified
								</Button>
								<Button
									type="button"
									className={ACTION_BTN}
									disabled={busy}
									onClick={onAcceptRisk}
								>
									<ShieldAlert className="h-4 w-4" />
									Accept risk
								</Button>
							</div>
							<div className="border-t border-slate-200/80" role="separator" />
							<p className="text-xs text-slate-500">
								<span className="font-semibold text-slate-700">Next step:</span>{" "}
								{nextStepForVerdict(verdict, readinessIds)}
							</p>
						</>
					) : isConfirmed ? (
						<>
							{/* Confirmed + CAP status chip on one line */}
							<div
								className="flex flex-wrap items-center gap-2"
								role="status"
								aria-live="polite"
							>
								<span
									className={cn(
										BADGE_BASE,
										"bg-green/10 text-green border-green/20",
									)}
								>
									<Check className="h-3.5 w-3.5" aria-hidden />
									Confirmed
								</span>
								{capChip ? (
									<span
										className={cn(BADGE_BASE, capChip.className)}
										role="status"
									>
										{capChip.label}
									</span>
								) : null}
							</div>

							{cap ? (
								<>
									<div
										className="border-t border-slate-200/80"
										role="separator"
									/>
									<div
										aria-live="polite"
										className="space-y-3 rounded-lg border border-[#a0c4db]/60 bg-[#e1f3ff]/40 px-3 py-2.5"
									>
										<div className="flex flex-col gap-2">
											{capDateLabel ? (
												<span
													className={cn(
														BADGE_BASE,
														"w-fit border-[#078fab]/25 bg-white/80 text-[#0f5384]",
													)}
												>
													<Calendar
														className="h-3.5 w-3.5 text-[#078fab]"
														aria-hidden
													/>
													{capDateLabel}
												</span>
											) : null}
											<p className="text-sm font-semibold leading-snug text-[#0f5384]">
												{cap.title}
											</p>
										</div>
										{canManageCaps && cap.status === "open" && onStartCap ? (
											<div className="block w-full min-w-0">
												<Button
													type="button"
													className="btn-primary !w-full max-w-none px-3 sm:!w-full sm:px-4"
													disabled={busy}
													aria-label="Start corrective action"
													onClick={onStartCap}
												>
													<Play className="h-3.5 w-3.5" />
													Start
												</Button>
											</div>
										) : null}
										{cap.status === "in_progress" ||
										cap.status === "pending_verification" ||
										(cap.evidenceAttachments?.length ?? 0) > 0 ? (
											<div className="w-full space-y-2">
												<CapEvidenceStrip
													capId={cap.$id}
													attachments={cap.evidenceAttachments ?? []}
													layout="compact"
													size="sm"
													maxFiles={10}
													canUpload={false}
													canDelete={
														Boolean(canManageCaps) &&
														(cap.status === "in_progress" ||
															cap.status === "pending_verification" ||
															cap.status === "open")
													}
													onUploaded={onEvidenceUploaded}
													onDeleted={onEvidenceUploaded}
													onViewAll={openCorrectiveActionSection}
												/>
												{canManageCaps &&
												cap.status === "in_progress" &&
												onCloseCap ? (
													<div className="block w-full min-w-0">
														<Button
															type="button"
															className="btn-primary !w-full max-w-none px-3 sm:!w-full sm:px-4"
															disabled={busy}
															aria-label="Close corrective action"
															onClick={onCloseCap}
														>
															<Check className="h-3.5 w-3.5" />
															Mark closed
														</Button>
													</div>
												) : null}
											</div>
										) : null}
									</div>
								</>
							) : null}
						</>
					) : (
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							{finding.status.replaceAll("_", " ")}
						</p>
					)}

					<button
						type="button"
						aria-expanded={detailsOpen}
						aria-controls={drawerId}
						onClick={onToggleDetails}
						className="mt-auto cursor-pointer pt-2 text-left text-xs font-semibold text-[#078fab] hover:underline"
					>
						{detailsOpen ? "Hide details ↑" : "Show details ↓"}
					</button>
				</div>
			</div>

			{/* Detail drawer */}
			<div
				id={drawerId}
				hidden={!detailsOpen}
				className={cn("border-t border-slate-200/80", !detailsOpen && "hidden")}
			>
				{detailsOpen ? (
					<div className="space-y-4 p-4 sm:p-5">
						<section aria-label="Finding text">
							<p className={SECTION_LABEL}>Finding</p>
							<div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-700">
								{proseParagraphs(conditionText || finding.description).map(
									(paragraph, index) => (
										<p key={`${finding.$id}-p-${index}`}>{paragraph}</p>
									),
								)}
							</div>
							{showHowToCorrect ? (
								<div className="mt-3 space-y-2 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
									<p className="font-bold text-slate-700">How to correct</p>
									{proseParagraphs(correctiveText).map((paragraph, index) => (
										<p key={`${finding.$id}-fix-${index}`}>{paragraph}</p>
									))}
									{showMeHow ? (
										<div className="flex w-full justify-end pt-1">
											<Button
												type="button"
												className="btn-primary px-3 sm:px-4"
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
												<Sparkles className="h-3.5 w-3.5" />
												Show me how
											</Button>
										</div>
									) : null}
								</div>
							) : null}
							{finding.managementResponse ? (
								<div className="mt-3 space-y-2 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
									<p className="font-bold text-slate-700">Management</p>
									{proseParagraphs(
										cleanManagementResponse(finding.managementResponse),
									).map((paragraph, index) => (
										<p key={`${finding.$id}-mgmt-${index}`}>{paragraph}</p>
									))}
								</div>
							) : null}
						</section>

						<section
							aria-label="Source"
							className="border-t border-slate-200/80 pt-4"
						>
							<p className={SECTION_LABEL}>Source</p>
							<div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
								<span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100/80 px-2.5 py-0.5 text-slate-600">
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
							aria-label="Corrective action"
							className="scroll-mt-4 border-t border-slate-200/80 pt-4 outline-none"
						>
							<p className={SECTION_LABEL}>Corrective action</p>
							{cap ? (
								<div
									role="region"
									aria-label="Corrective action plan"
									className="mt-2 overflow-hidden rounded-lg border border-[#a0c4db]/60 bg-[#e1f3ff]/30"
								>
									<div className="flex justify-between space-y-3 px-3 py-3 sm:px-4">
										{capDateLabel || capChip ? (
											<div className="flex flex-wrap items-center gap-2">
												{capDateLabel ? (
													<span
														className={cn(
															BADGE_BASE,
															"w-fit border-[#078fab]/25 bg-[#e1f3ff]/60 text-[#0f5384]",
														)}
													>
														<Calendar
															className="h-3.5 w-3.5 text-[#078fab]"
															aria-hidden
														/>
														{capDateLabel}
													</span>
												) : null}
												{capChip ? (
													<span
														className={cn(
															BADGE_BASE,
															"shrink-0",
															capChip.className,
														)}
													>
														{capChip.label}
													</span>
												) : null}
											</div>
										) : null}
										<h4 className="text-sm font-semibold text-[#0f5384]">
											{cap.title}
										</h4>
										<p className="text-sm text-slate-600">
											<span className="font-bold text-slate-700">
												Root cause:
											</span>{" "}
											{cap.rootCause.replaceAll("_", " ")}
										</p>
									</div>
									{cap.status === "open" ||
									cap.status === "in_progress" ||
									cap.status === "pending_verification" ||
									(cap.evidenceAttachments?.length ?? 0) > 0 ||
									canManageCaps ? (
										<div className="space-y-2 border-t border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-4">
											{cap.status === "open" && canManageCaps && onStartCap ? (
												<div className="w-full">
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
											<CapEvidenceStrip
												capId={cap.$id}
												attachments={cap.evidenceAttachments ?? []}
												layout="full"
												size="sm"
												maxFiles={10}
												canUpload={
													Boolean(canManageCaps) &&
													cap.status !== "closed" &&
													cap.status !== "verified"
												}
												canDelete={
													Boolean(canManageCaps) &&
													cap.status !== "closed" &&
													cap.status !== "verified"
												}
												onUploaded={onEvidenceUploaded}
												onDeleted={onEvidenceUploaded}
											/>
											{canManageCaps &&
											cap.status === "in_progress" &&
											onCloseCap ? (
												<div className="flex w-full items-center justify-end gap-3">
													{canChat ? (
														<button
															type="button"
															className="cursor-pointer text-xs font-semibold text-[#0f5384] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
															disabled={busy || isGuiding}
															aria-label="Open Ask CAALM chat for this finding"
															onClick={() => {
																if (!getRemediationChatId(finding.$id)) {
																	setHasRemediationChat(false);
																}
																void openRemediationChat(finding.$id);
															}}
														>
															Chat
														</button>
													) : null}
													<Button
														type="button"
														className="btn-primary px-3 sm:px-4"
														disabled={busy}
														aria-label="Close corrective action"
														onClick={onCloseCap}
													>
														<Check className="h-3.5 w-3.5" />
														Mark closed
													</Button>
												</div>
											) : canChat && hasRemediationChat ? (
												<div className="flex w-full items-center justify-end">
													<button
														type="button"
														className="cursor-pointer text-xs font-semibold text-[#0f5384] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
														disabled={busy || isGuiding}
														aria-label="Open Ask CAALM chat for this finding"
														onClick={() =>
															void openRemediationChat(finding.$id)
														}
													>
														Chat
													</button>
												</div>
											) : null}
										</div>
									) : null}
								</div>
							) : (
								<div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-4 py-5 text-center">
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
				) : null}
			</div>
		</article>
	);
}
