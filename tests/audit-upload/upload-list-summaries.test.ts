import { describe, expect, it } from "vitest";
import type {
	AuditDocumentRecord,
	AuditFindingRecord,
} from "@/lib/audit-upload/types";
import {
	buildActionNeededCallout,
	deriveAuditScoreboard,
	deriveDocumentListSummary,
} from "@/lib/audit-upload/upload-list-summaries";

function doc(
	overrides: Partial<AuditDocumentRecord> = {},
): AuditDocumentRecord {
	return {
		$id: "doc1",
		orgId: "org",
		uploadedBy: "u1",
		fileName: "report.pdf",
		mimeType: "application/pdf",
		fileSize: 1,
		storageFileId: "f",
		contentHash: "h",
		status: "complete",
		processingLog: [],
		summary: null,
		metadata: {
			classification: {
				auditorName: "Whitcomb, Reyes & Amaral, CPAs",
				periodStart: "2025-07-01",
				periodEnd: "2026-06-30",
			},
		},
		errorMessage: null,
		deletedAt: null,
		$createdAt: "2026-10-28T12:00:00.000Z",
		...overrides,
	};
}

function finding(
	overrides: Partial<AuditFindingRecord> = {},
): AuditFindingRecord {
	return {
		$id: "f1",
		orgId: "org",
		documentId: "doc1",
		title: "Finding",
		description: "",
		frameworkRefs: [],
		severityReported: "high",
		severityComputed: "high",
		likelihood: 3,
		impact: 3,
		riskScore: 9,
		confidence: 0.9,
		citations: [],
		citationCheckPassed: true,
		findingCode: null,
		managementResponse: null,
		monetaryImpactUsd: null,
		controlDeficiencyType: null,
		correctionObligations: [],
		responseStance: null,
		responseCommittedDate: null,
		responseAuditor: null,
		responseSourceRef: null,
		findingKey: "k",
		isRepeat: false,
		repeatOfFindingId: null,
		status: "draft",
		reconciliation: null,
		disputeReason: null,
		riskAcceptanceReason: null,
		riskAcceptedBy: null,
		riskAcceptedAt: null,
		...overrides,
	};
}

describe("deriveDocumentListSummary", () => {
	it("marks processing while pipeline runs", () => {
		const summary = deriveDocumentListSummary(
			doc({ status: "extracting" }),
			[],
		);
		expect(summary.workflow).toBe("processing");
	});

	it("needs_review when complete with draft findings only", () => {
		const summary = deriveDocumentListSummary(doc(), [
			finding({ status: "draft" }),
			finding({ $id: "f2", status: "draft", severityComputed: "medium" }),
		]);
		expect(summary.workflow).toBe("needs_review");
		expect(summary.awaitingConfirmation).toBe(2);
		expect(summary.severityHigh).toBe(1);
		expect(summary.severityMed).toBe(1);
	});

	it("in_progress when some findings confirmed", () => {
		const summary = deriveDocumentListSummary(doc(), [
			finding({ status: "confirmed" }),
			finding({ $id: "f2", status: "draft" }),
		]);
		expect(summary.workflow).toBe("in_progress");
		expect(summary.confirmedCount).toBe(1);
	});

	it("complete when all findings resolved", () => {
		const summary = deriveDocumentListSummary(doc(), [
			finding({ status: "disputed" }),
			finding({ $id: "f2", status: "accepted_risk" }),
		]);
		expect(summary.workflow).toBe("complete");
	});
});

describe("buildActionNeededCallout", () => {
	it("combines gap and mismatch copy", () => {
		const message = buildActionNeededCallout({
			findingCount: 2,
			awaitingConfirmation: 2,
			confirmedCount: 0,
			resolvedCount: 0,
			severityHigh: 1,
			severityMed: 0,
			severityLow: 0,
			untrackedGapCount: 1,
			severityMismatchCount: 1,
			workflow: "needs_review",
			auditorLabel: null,
			periodLabel: null,
		});
		expect(message).toContain("untracked gap");
		expect(message).toContain("severity mismatch");
	});
});

describe("deriveAuditScoreboard", () => {
	it("marks awaiting alert when draft findings have gap or mismatch", () => {
		const board = deriveAuditScoreboard(
			[doc()],
			[
				finding({
					status: "draft",
					reconciliation: {
						verdict: "untracked_gap",
						rationale: "x",
						matchedRequirementIds: [],
						confidence: 0.8,
					},
					$createdAt: "2026-10-20T00:00:00.000Z",
				}),
				finding({
					$id: "f2",
					status: "draft",
					severityComputed: "medium",
					reconciliation: {
						verdict: "supported",
						rationale: "ok",
						matchedRequirementIds: [],
						confidence: 0.9,
					},
					$createdAt: "2026-10-25T00:00:00.000Z",
				}),
			],
		);
		expect(board.awaitingState).toBe("alert");
		expect(board.untrackedGapCount).toBe(1);
		expect(board.unreviewedCount).toBe(1);
		expect(board.oldestUnconfirmedAt).toBe("2026-10-20T00:00:00.000Z");
		expect(board.fiscalYearLabel).toBe("FY 2025–26");
		expect(board.uniqueAuditorCount).toBe(1);
		expect(board.showTrendsNudge).toBe(true);
	});

	it("marks awaiting complete when nothing is draft", () => {
		const board = deriveAuditScoreboard(
			[doc()],
			[finding({ status: "confirmed" })],
		);
		expect(board.awaitingState).toBe("complete");
		expect(board.awaitingConfirmation).toBe(0);
		expect(board.oldestUnconfirmedAt).toBeNull();
		expect(board.confirmedFindingsCount).toBe(1);
		expect(board.stillOpenFindingsCount).toBe(0);
	});

	it("sums confirmed, open, repeats, and questioned costs for findings card", () => {
		const board = deriveAuditScoreboard(
			[doc()],
			[
				finding({
					status: "confirmed",
					monetaryImpactUsd: 85000,
				}),
				finding({
					$id: "f2",
					status: "draft",
					isRepeat: true,
					monetaryImpactUsd: 46500,
				}),
				finding({
					$id: "f3",
					status: "draft",
					severityComputed: "low",
					monetaryImpactUsd: null,
				}),
			],
		);
		expect(board.confirmedFindingsCount).toBe(1);
		expect(board.stillOpenFindingsCount).toBe(2);
		expect(board.repeatFindingsCount).toBe(1);
		expect(board.monetaryImpactUsdTotal).toBe(131500);
	});

	it("counts unique auditors across completed uploads", () => {
		const board = deriveAuditScoreboard(
			[
				doc({ $id: "doc1" }),
				doc({
					$id: "doc2",
					metadata: {
						classification: {
							auditorName: "Other Firm LLP",
							periodStart: "2024-07-01",
							periodEnd: "2025-06-30",
						},
					},
				}),
			],
			[],
		);
		expect(board.uniqueAuditorCount).toBe(2);
		expect(board.uploadCount).toBe(2);
	});
});
