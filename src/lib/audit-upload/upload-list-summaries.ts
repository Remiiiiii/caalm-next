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

function formatFiscalYearLabel(
	periodStart?: string | null,
	periodEnd?: string | null,
	period?: string | null,
): string | null {
	if (period?.trim()) return period.trim();
	const startYear = periodStart?.slice(0, 4);
	const endYear = periodEnd?.slice(0, 4);
	if (startYear && endYear) return `FY ${startYear}–${endYear}`;
	if (startYear) return `FY ${startYear}`;
	return null;
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
