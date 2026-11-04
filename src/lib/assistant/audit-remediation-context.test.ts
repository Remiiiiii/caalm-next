import { describe, expect, it } from "vitest";
import type { AuditFindingRecord } from "@/lib/audit-upload/types";
import {
	auditRemediationUserPrompt,
	buildAuditRemediationContext,
	buildAuditRemediationPrompt,
	conversationTitleForRemediation,
	parseAuditRemediationLaunch,
} from "./audit-remediation-context";

const finding = {
	$id: "find-1",
	orgId: "org-1",
	documentId: "doc-1",
	title: "2026-004 — SEFA misclassification",
	description:
		"Spend was booked to the wrong assistance listing.\n\nMap each federal award to its assistance listing number.",
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

describe("parseAuditRemediationLaunch", () => {
	it("accepts a valid payload", () => {
		expect(
			parseAuditRemediationLaunch({
				kind: "audit_remediation",
				findingId: "find-1",
				documentId: "doc-1",
			}),
		).toEqual({
			kind: "audit_remediation",
			findingId: "find-1",
			documentId: "doc-1",
		});
	});

	it("returns null when missing", () => {
		expect(parseAuditRemediationLaunch(undefined)).toBeNull();
	});

	it("returns invalid for a bad shape", () => {
		expect(parseAuditRemediationLaunch({ kind: "other" })).toBe("invalid");
		expect(
			parseAuditRemediationLaunch({
				kind: "audit_remediation",
				findingId: "",
				documentId: "doc-1",
			}),
		).toBe("invalid");
	});
});

describe("auditRemediationUserPrompt", () => {
	it("names the finding in the chat bubble", () => {
		expect(
			auditRemediationUserPrompt("2026-004", "2026-004 — SEFA misclassification"),
		).toBe(
			"Show me how to implement the corrective steps for 2026-004 — SEFA misclassification.",
		);
	});
});

describe("buildAuditRemediationPrompt", () => {
	it("confirms the finding code and How to correct text", () => {
		const ctx = buildAuditRemediationContext({ finding });
		const prompt = buildAuditRemediationPrompt(ctx);
		expect(conversationTitleForRemediation(ctx)).toBe(
			"2026-004 — SEFA misclassification",
		);
		expect(prompt).toContain("2026-004 — SEFA misclassification");
		expect(prompt).toContain(
			"Map each federal award to its assistance listing number.",
		);
		expect(prompt).toContain("live org-data research");
		expect(prompt).not.toContain("find-1");
	});
});
