import { describe, expect, it } from "vitest";
import type {
	AuditCapRecord,
	AuditFindingRecord,
} from "@/lib/audit-upload/types";
import {
	buildImplementationAnalysis,
	changesFromPendingArgs,
} from "./implementation-analysis";

const finding = {
	$id: "find-1",
	orgId: "org-1",
	documentId: "doc-1",
	title: "2026-004 — SEFA misclassification",
	description: "Wrong listing.\n\nMap each award.",
	frameworkRefs: [],
	severityReported: "high",
	severityComputed: "high",
	likelihood: 3,
	impact: 4,
	riskScore: 12,
	confidence: 0.8,
	citations: [],
	citationCheckPassed: true,
	findingCode: "2026-004",
	managementResponse: null,
	monetaryImpactUsd: null,
	controlDeficiencyType: null,
	findingKey: "k",
	isRepeat: false,
	repeatOfFindingId: null,
	status: "confirmed",
	reconciliation: null,
	disputeReason: null,
	riskAcceptanceReason: null,
	riskAcceptedBy: null,
	riskAcceptedAt: null,
} as AuditFindingRecord;

const openCap = {
	$id: "cap-1",
	orgId: "org-1",
	documentId: "doc-1",
	findingId: "find-1",
	title: "Correct SEFA mapping",
	rootCause: "system_control",
	assigneeId: null,
	status: "open",
	dueAt: "2027-01-31T00:00:00.000Z",
	escalationTier: 0,
	verificationEvidence: null,
	evidenceAttachments: [],
	closedAt: null,
} as AuditCapRecord;

describe("buildImplementationAnalysis", () => {
	it("offers starting an open CAP with visible labels", () => {
		const result = buildImplementationAnalysis({
			finding,
			cap: openCap,
			canManageCaps: true,
		});
		expect(result.canApply).toBe(true);
		expect(result.changes[0]).toEqual({
			label: "Corrective action status",
			current: "Open",
			required: "In progress",
		});
		expect(result.markdown).not.toContain("in_progress");
		expect(result.applyArgs?.capId).toBe("cap-1");
	});

	it("blocks apply when the user cannot manage CAPs", () => {
		const result = buildImplementationAnalysis({
			finding,
			cap: openCap,
			canManageCaps: false,
		});
		expect(result.canApply).toBe(false);
		expect(result.blockers.length).toBeGreaterThan(0);
	});

	it("reads apply-card changes from pending args", () => {
		expect(
			changesFromPendingArgs({
				changes: [
					{
						label: "Corrective action status",
						current: "Open",
						required: "In progress",
					},
				],
			}),
		).toEqual([
			{
				label: "Corrective action status",
				current: "Open",
				required: "In progress",
			},
		]);
	});

	it("does not auto-close an in-progress CAP", () => {
		const result = buildImplementationAnalysis({
			finding,
			cap: { ...openCap, status: "in_progress" },
			canManageCaps: true,
		});
		expect(result.canApply).toBe(false);
		expect(result.applyArgs).toBeNull();
	});
});
