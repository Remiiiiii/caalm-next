"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	ClipboardCheck,
	Play,
	ShieldAlert,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
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
		return `${prefix} ${format(new Date(iso), "M/d/yyyy")}`;
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

const SEVERITY_LABEL_CLASS: Record<AuditSeverity, string> = {
	critical: "text-red",
	high: "text-orange",
	medium: "text-orange",
	low: "text-green",
	informational: "text-slate-600",
};

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

const SEVERITY_CONTEXT: Record<AuditSeverity, string> = {
	critical:
		"Severe risk to compliance or operations; corrective action is required immediately.",
	high: "Elevated risk; corrective action should begin promptly after audit close.",
	medium:
		"Moderate risk; corrective action required within 90 days of audit close.",
	low: "Lower risk; track and remediate on a normal schedule.",
	informational:
		"Informational only; document for awareness and follow-up if needed.",
};

const DEFICIENCY_LABEL: Record<ControlDeficiencyType, string> = {
	material_weakness: "Material weakness",
	significant_deficiency: "Significant deficiency",
	control_deficiency: "Control deficiency",
};

const DEFICIENCY_CONTEXT: Record<ControlDeficiencyType, string> = {
	material_weakness:
		"A deficiency that could allow a material misstatement; highest priority for remediation.",
	significant_deficiency:
		"Less severe than a material weakness; requires management attention and a remediation plan.",
	control_deficiency:
		"A control shortfall that is less severe than a significant deficiency; still needs remediation.",
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

function riskScoreContext(score: number): string {
	if (score >= 15) {
		return "High likelihood of recurrence and federal disallowance if unresolved.";
	}
	if (score >= 9) {
		return "Meaningful recurrence risk; prioritize remediation and evidence of fix.";
	}
	if (score >= 4) {
		return "Moderate score; close the gap and keep evidence ready for the next review.";
	}
	return "Lower score; still track closure so the issue does not drift.";
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
}) {
	const verdict = finding.reconciliation?.verdict ?? null;
	const readinessIds = finding.reconciliation?.matchedRequirementIds ?? [];
	const drawerId = `finding-drawer-${finding.$id}`;
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

	return (
		<article
			className={cn(
				"overflow-hidden rounded-lg border border-slate-200/80 border-l-4 bg-white/80 shadow-sm",
				SEVERITY_ACCENT[finding.severityComputed],
			)}
		>
			{/* Split header: wide identity | narrow actions */}
			<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_27rem]">
				{/* Left panel */}
				<div className="min-w-0 space-y-3 p-4 sm:p-5">
					<div className="flex items-start gap-2.5">
						{finding.findingCode ? (
							<span
								aria-label={`Finding ${finding.findingCode}`}
								className="mt-0.5 inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-[#a0c4db] bg-[#e1f3ff] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#0f5384]"
							>
								{finding.findingCode}
							</span>
						) : null}
						<h3 className="min-w-0 text-sm font-semibold text-slate-700">
							{displayTitle}
						</h3>
					</div>

					<dl className="space-y-1.5 text-sm">
						<div className="flex flex-wrap gap-x-1">
							<dt
								className={cn(
									"shrink-0 font-bold",
									SEVERITY_LABEL_CLASS[finding.severityComputed],
								)}
							>
								{severityDisplayLabel(finding.severityComputed)}
							</dt>
							<dd className="min-w-0 text-slate-500">
								<span className="text-slate-400" aria-hidden>
									{" — "}
								</span>
								{SEVERITY_CONTEXT[finding.severityComputed]}
							</dd>
						</div>

						{finding.controlDeficiencyType ? (
							<div className="flex flex-wrap gap-x-1">
								<dt className="shrink-0 font-bold text-slate-700">
									{DEFICIENCY_LABEL[finding.controlDeficiencyType]}
								</dt>
								<dd className="min-w-0 text-slate-500">
									<span className="text-slate-400" aria-hidden>
										{" — "}
									</span>
									{DEFICIENCY_CONTEXT[finding.controlDeficiencyType]}
								</dd>
							</div>
						) : null}

						<div className="flex flex-wrap gap-x-1">
							<dt className="shrink-0 font-bold text-slate-700">
								Risk score {finding.riskScore}
							</dt>
							<dd className="min-w-0 text-slate-500">
								<span className="text-slate-400" aria-hidden>
									{" — "}
								</span>
								{riskScoreContext(finding.riskScore)}
							</dd>
						</div>

						{finding.isRepeat ? (
							<div className="flex flex-wrap gap-x-1">
								<dt className="shrink-0 font-bold text-[#078fab]">
									↻ Repeat finding
								</dt>
								<dd className="min-w-0 text-slate-500">
									<span className="text-slate-400" aria-hidden>
										{" — "}
									</span>
									{repeatOfCode
										? `Also cited in prior-year Finding ${repeatOfCode}; corrective action was not completed.`
										: "Also cited in a prior-year finding; corrective action was not completed."}
								</dd>
							</div>
						) : null}
					</dl>

					{/* Reconciliation verdict — do not alter appearance / ARIA */}
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
								<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
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
										className="space-y-2 rounded-lg border border-[#a0c4db]/60 bg-[#e1f3ff]/40 px-3 py-2.5"
									>
										<p className="text-sm font-semibold text-[#0f5384]">
											{cap.title}
										</p>
										{capDateLabel ? (
											<p className="text-xs text-slate-500">{capDateLabel}</p>
										) : null}
										{canManageCaps && cap.status === "open" && onStartCap ? (
											<div className="flex justify-end">
												<Button
													type="button"
													className="btn-primary px-3 sm:px-4"
													disabled={busy}
													aria-label="Start corrective action"
													onClick={onStartCap}
												>
													<Play className="h-3.5 w-3.5" />
													Start
												</Button>
											</div>
										) : null}
										{canManageCaps &&
										cap.status === "in_progress" &&
										onCloseCap ? (
											<div className="flex justify-end">
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
								{proseParagraphs(finding.description).map(
									(paragraph, index) => (
										<p key={`${finding.$id}-p-${index}`}>{paragraph}</p>
									),
								)}
							</div>
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
							aria-label="Corrective action"
							className="border-t border-slate-200/80 pt-4"
						>
							<p className={SECTION_LABEL}>Corrective action</p>
							{cap ? (
								<div
									role="region"
									aria-label="Corrective action plan"
									className="mt-2 overflow-hidden rounded-lg border border-[#a0c4db]/60 bg-[#e1f3ff]/30"
								>
									<div className="space-y-2 px-3 py-3 sm:px-4">
										{/* Title + status chip same line */}
										<div className="flex flex-wrap items-start gap-2">
											<h4 className="min-w-0 flex-1 text-sm font-semibold text-[#0f5384]">
												{cap.title}
											</h4>
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
										{capDateLabel ? (
											<p className="text-xs text-slate-500">{capDateLabel}</p>
										) : null}
										<p className="text-sm text-slate-600">
											<span className="font-bold text-slate-700">
												Root cause:
											</span>{" "}
											{cap.rootCause.replaceAll("_", " ")}
										</p>
									</div>
									{canManageCaps &&
									(cap.status === "open" || cap.status === "in_progress") ? (
										<div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-4">
											{cap.status === "open" && onStartCap ? (
												<Button
													type="button"
													className="btn-primary"
													disabled={busy}
													aria-label="Start corrective action"
													onClick={onStartCap}
												>
													<Play className="h-3.5 w-3.5" />
													Start
												</Button>
											) : null}
											{onCloseCap ? (
												<Button
													type="button"
													className="btn-primary px-3"
													disabled={busy}
													aria-label="Close corrective action"
													onClick={onCloseCap}
												>
													<Check className="h-3.5 w-3.5" />
													Mark closed
												</Button>
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
