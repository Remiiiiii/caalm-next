import type {
	AuditDocumentRecord,
	AuditDocumentStatus,
	AuditFindingRecord,
	AuditFindingStatus,
	AuditSeverity,
} from "./types";

export type AuditUploadWorkflowState =
	| "processing"
	| "needs_review"
	| "in_progress"
	| "complete"
	| "failed";

export interface AuditDocumentListSummary {
	findingCount: number;
	awaitingConfirmation: number;
	confirmedCount: number;
	resolvedCount: number;
	severityHigh: number;
	severityMed: number;
	severityLow: number;
	untrackedGapCount: number;
	severityMismatchCount: number;
	workflow: AuditUploadWorkflowState;
	auditorLabel: string | null;
	periodLabel: string | null;
}

const RESOLVED_STATUSES: AuditFindingStatus[] = [
	"confirmed",
	"disputed",
	"rectified",
	"closed",
	"accepted_risk",
];

function isProcessing(status: AuditDocumentStatus): boolean {
	return status !== "complete" && status !== "failed";
}

function severityBucket(severity: AuditSeverity): "high" | "med" | "low" | null {
	if (severity === "critical" || severity === "high") return "high";
	if (severity === "medium") return "med";
	if (severity === "low" || severity === "informational") return "low";
	return null;
}

const MONTH_SHORT = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

function formatMonthYear(iso: string): string | null {
	const match = iso.match(/^(\d{4})-(\d{2})/);
	if (!match) return null;
	const year = match[1];
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return null;
	return `${MONTH_SHORT[monthIndex]} ${year}`;
}

function formatFiscalYearLabel(
	periodStart?: string | null,
	periodEnd?: string | null,
	period?: string | null,
): string | null {
	const startLabel = periodStart ? formatMonthYear(periodStart) : null;
	const endLabel = periodEnd ? formatMonthYear(periodEnd) : null;
	if (startLabel && endLabel) return `FY ${startLabel} – ${endLabel}`;
	if (period?.trim()) return period.trim();
	const startYear = periodStart?.slice(0, 4);
	const endYear = periodEnd?.slice(0, 4);
	if (startYear && endYear) return `FY ${startYear}–${endYear}`;
	if (startYear) return `FY ${startYear}`;
	return null;
}

function truncateLabel(value: string, max = 28): string {
	const trimmed = value.trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max - 1)}…`;
}

/** Truncate auditor firm names for dense table cells (~24 chars). */
export function truncateAuditorLabel(
	value: string | null,
	max = 24,
): string | null {
	if (!value) return null;
	return truncateLabel(value, max);
}

export function extractAuditorMeta(metadata: Record<string, unknown> | null): {
	auditorLabel: string | null;
	periodLabel: string | null;
} {
	const classification =
		metadata && typeof metadata.classification === "object"
			? (metadata.classification as Record<string, unknown>)
			: null;
	if (!classification) {
		return { auditorLabel: null, periodLabel: null };
	}
	const auditorName =
		typeof classification.auditorName === "string"
			? classification.auditorName.trim()
			: null;
	const periodLabel = formatFiscalYearLabel(
		typeof classification.periodStart === "string"
			? classification.periodStart
			: null,
		typeof classification.periodEnd === "string" ? classification.periodEnd : null,
		typeof classification.period === "string" ? classification.period : null,
	);
	return {
		auditorLabel: auditorName || null,
		periodLabel,
	};
}

export function deriveDocumentListSummary(
	doc: AuditDocumentRecord,
	findings: AuditFindingRecord[],
): AuditDocumentListSummary {
	const { auditorLabel, periodLabel } = extractAuditorMeta(doc.metadata);

	let severityHigh = 0;
	let severityMed = 0;
	let severityLow = 0;
	let awaitingConfirmation = 0;
	let confirmedCount = 0;
	let resolvedCount = 0;
	let untrackedGapCount = 0;
	let severityMismatchCount = 0;

	for (const finding of findings) {
		const bucket = severityBucket(finding.severityComputed);
		if (bucket === "high") severityHigh += 1;
		else if (bucket === "med") severityMed += 1;
		else if (bucket === "low") severityLow += 1;

		if (finding.status === "draft") awaitingConfirmation += 1;
		if (finding.status === "confirmed") confirmedCount += 1;
		if (RESOLVED_STATUSES.includes(finding.status)) resolvedCount += 1;

		const verdict = finding.reconciliation?.verdict;
		if (verdict === "untracked_gap") untrackedGapCount += 1;
		if (verdict === "severity_mismatch") severityMismatchCount += 1;
	}

	const findingCount = findings.length;
	let workflow: AuditUploadWorkflowState;

	if (doc.status === "failed") {
		workflow = "failed";
	} else if (isProcessing(doc.status)) {
		workflow = "processing";
	} else if (findingCount === 0 || resolvedCount === findingCount) {
		workflow = "complete";
	} else if (confirmedCount === 0) {
		workflow = "needs_review";
	} else {
		workflow = "in_progress";
	}

	return {
		findingCount,
		awaitingConfirmation,
		confirmedCount,
		resolvedCount,
		severityHigh,
		severityMed,
		severityLow,
		untrackedGapCount,
		severityMismatchCount,
		workflow,
		auditorLabel,
		periodLabel,
	};
}

export function buildActionNeededCallout(summary: AuditDocumentListSummary): string | null {
	if (
		summary.workflow !== "needs_review" &&
		summary.workflow !== "in_progress"
	) {
		return null;
	}
	const parts: string[] = [];
	if (summary.untrackedGapCount > 0) {
		const n = summary.untrackedGapCount;
		parts.push(
			`${n} untracked gap${n === 1 ? "" : "s"}`,
		);
	}
	if (summary.severityMismatchCount > 0) {
		const n = summary.severityMismatchCount;
		parts.push(
			`${n} severity mismatch${n === 1 ? "" : "es"}`,
		);
	}
	if (parts.length === 0) return null;

	if (parts.length === 2) {
		return `${parts[0]} and ${parts[1]} — review reconciliation verdicts before confirming findings.`;
	}
	if (summary.untrackedGapCount > 0) {
		return `${parts[0]} — create readiness items before confirming.`;
	}
	return `${parts[0]} — review reconciliation verdicts before confirming.`;
}

export interface AuditUploadListTotals {
	uploadCount: number;
	totalFindings: number;
	awaitingConfirmation: number;
	completedUploadCount: number;
}

export function deriveUploadListTotals(
	documents: AuditDocumentRecord[],
	summaries: AuditDocumentListSummary[],
): AuditUploadListTotals {
	return {
		uploadCount: documents.length,
		totalFindings: summaries.reduce((sum, s) => sum + s.findingCount, 0),
		awaitingConfirmation: summaries.reduce(
			(sum, s) => sum + s.awaitingConfirmation,
			0,
		),
		completedUploadCount: documents.filter((d) => d.status === "complete").length,
	};
}

export type AuditScoreboardAlertState = "neutral" | "alert" | "complete";

export interface AuditScoreboard {
	uploadCount: number;
	completeCount: number;
	processingCount: number;
	failedCount: number;
	fiscalYearLabel: string | null;
	/** Count of distinct auditor firm names across completed uploads. */
	uniqueAuditorCount: number;
	totalFindings: number;
	severityHigh: number;
	severityMed: number;
	severityLow: number;
	/** Findings a person has confirmed. */
	confirmedFindingsCount: number;
	/** Findings still in draft (not confirmed / disputed / closed yet). */
	stillOpenFindingsCount: number;
	/** Findings marked as repeats of a prior-year item. */
	repeatFindingsCount: number;
	/** Sum of questioned costs / exposure when the report stated a dollar amount. */
	monetaryImpactUsdTotal: number;
	awaitingConfirmation: number;
	untrackedGapCount: number;
	severityMismatchCount: number;
	unreviewedCount: number;
	oldestUnconfirmedAt: string | null;
	awaitingState: AuditScoreboardAlertState;
	showTrendsNudge: boolean;
}

function shortFiscalYearLabel(periodLabel: string | null): string | null {
	if (!periodLabel) return null;
	const years = periodLabel.match(/20\d{2}/g);
	if (years && years.length >= 2) {
		return `FY ${years[0]}–${years[1].slice(2)}`;
	}
	if (years && years.length === 1) return `FY ${years[0]}`;
	if (/^FY\s/i.test(periodLabel)) return periodLabel;
	return truncateLabel(periodLabel, 14);
}

/** Org-wide scoreboard for the Uploaded Audits overview band. */
export function deriveAuditScoreboard(
	documents: AuditDocumentRecord[],
	findings: AuditFindingRecord[],
): AuditScoreboard {
	let completeCount = 0;
	let processingCount = 0;
	let failedCount = 0;

	for (const doc of documents) {
		if (doc.status === "complete") completeCount += 1;
		else if (doc.status === "failed") failedCount += 1;
		else processingCount += 1;
	}

	const completedDocs = documents
		.filter((doc) => doc.status === "complete")
		.sort((a, b) => {
			const aTime = a.$createdAt ? Date.parse(a.$createdAt) : 0;
			const bTime = b.$createdAt ? Date.parse(b.$createdAt) : 0;
			return bTime - aTime;
		});

	const auditorNames = new Set<string>();
	for (const doc of completedDocs) {
		const { auditorLabel } = extractAuditorMeta(doc.metadata);
		if (auditorLabel) auditorNames.add(auditorLabel);
	}

	const fiscalYearLabel = shortFiscalYearLabel(
		completedDocs[0]
			? extractAuditorMeta(completedDocs[0].metadata).periodLabel
			: null,
	);

	let severityHigh = 0;
	let severityMed = 0;
	let severityLow = 0;
	let confirmedFindingsCount = 0;
	let stillOpenFindingsCount = 0;
	let repeatFindingsCount = 0;
	let monetaryImpactUsdTotal = 0;
	let awaitingConfirmation = 0;
	let untrackedGapCount = 0;
	let severityMismatchCount = 0;
	let unreviewedCount = 0;
	let oldestUnconfirmedAt: string | null = null;

	for (const finding of findings) {
		const bucket = severityBucket(finding.severityComputed);
		if (bucket === "high") severityHigh += 1;
		else if (bucket === "med") severityMed += 1;
		else if (bucket === "low") severityLow += 1;

		if (finding.status === "confirmed") confirmedFindingsCount += 1;
		if (finding.status === "draft") stillOpenFindingsCount += 1;
		if (finding.isRepeat) repeatFindingsCount += 1;
		const money = Number(finding.monetaryImpactUsd);
		if (Number.isFinite(money) && money !== 0) {
			monetaryImpactUsdTotal += money;
		}

		if (finding.status !== "draft") continue;

		awaitingConfirmation += 1;
		const createdAt = finding.$createdAt;
		if (createdAt) {
			if (
				!oldestUnconfirmedAt ||
				Date.parse(createdAt) < Date.parse(oldestUnconfirmedAt)
			) {
				oldestUnconfirmedAt = createdAt;
			}
		}

		const verdict = finding.reconciliation?.verdict;
		if (verdict === "untracked_gap") untrackedGapCount += 1;
		else if (verdict === "severity_mismatch") severityMismatchCount += 1;
		else if (verdict === "supported" || verdict === "stale_readiness") {
			unreviewedCount += 1;
		}
	}

	let awaitingState: AuditScoreboardAlertState = "neutral";
	if (awaitingConfirmation === 0) awaitingState = "complete";
	else if (untrackedGapCount + severityMismatchCount > 0) awaitingState = "alert";

	return {
		uploadCount: documents.length,
		completeCount,
		processingCount,
		failedCount,
		fiscalYearLabel,
		uniqueAuditorCount: auditorNames.size,
		totalFindings: findings.length,
		severityHigh,
		severityMed,
		severityLow,
		confirmedFindingsCount,
		stillOpenFindingsCount,
		repeatFindingsCount,
		monetaryImpactUsdTotal,
		awaitingConfirmation,
		untrackedGapCount,
		severityMismatchCount,
		unreviewedCount,
		oldestUnconfirmedAt:
			awaitingConfirmation === 0 ? null : oldestUnconfirmedAt,
		awaitingState,
		showTrendsNudge: completeCount < 2,
	};
}

export type AuditDocumentListItem = AuditDocumentRecord & {
	summary: AuditDocumentListSummary;
};

export function buildAuditDocumentListItems(
	documents: AuditDocumentRecord[],
	allFindings: AuditFindingRecord[],
): AuditDocumentListItem[] {
	const byDoc = new Map<string, AuditFindingRecord[]>();
	for (const finding of allFindings) {
		const list = byDoc.get(finding.documentId) ?? [];
		list.push(finding);
		byDoc.set(finding.documentId, list);
	}
	return documents.map((doc) => ({
		...doc,
		summary: deriveDocumentListSummary(doc, byDoc.get(doc.$id) ?? []),
	}));
}
