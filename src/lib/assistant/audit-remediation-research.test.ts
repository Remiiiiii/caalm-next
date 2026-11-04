import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildNullResultSuggestions,
	runAuditRemediationResearch,
} from "@/lib/assistant/audit-remediation-research";
import type { AssistantAuthContext } from "@/lib/assistant/auth";

vi.mock("@/lib/audit-upload/store", () => ({
	getAuditDocument: vi.fn(),
	getFinding: vi.fn(),
	listCaps: vi.fn(),
	listFindings: vi.fn(),
}));

import {
	getAuditDocument,
	getFinding,
	listCaps,
	listFindings,
} from "@/lib/audit-upload/store";

beforeEach(() => {
	vi.clearAllMocks();
});

const ctx = {
	orgId: "org-1",
	user: { $id: "user-1", email: "u@test.com", name: "User" },
	permissions: ["audit.manage_caps", "audit.manage_findings"],
} as unknown as AssistantAuthContext;

const remediationContext = {
	findingId: "find-1",
	documentId: "doc-1",
	title: "Missing policy",
	findingCode: "F-01",
	conditionText: "Policy was not documented.",
	correctiveText: "Publish the policy and upload proof.",
	capId: "cap-1",
	capStatus: "open",
	capTitle: "Fix policy gap",
};

describe("buildNullResultSuggestions", () => {
	it("deep-links confirm to the finding card", () => {
		const rows = buildNullResultSuggestions("doc-abc", "find-1");
		expect(rows.find((r) => r.id === "confirm-finding")?.action).toMatchObject({
			type: "navigate",
			href: "/audits/upload/doc-abc#finding-find-1",
		});
		expect(rows.some((r) => r.action.type === "prompt")).toBe(true);
	});
});

describe("runAuditRemediationResearch", () => {
	it("returns research steps and findings markdown when data loads", async () => {
		vi.mocked(getAuditDocument).mockResolvedValue({
			$id: "doc-1",
			orgId: "org-1",
			title: "SOC audit",
		} as Awaited<ReturnType<typeof getAuditDocument>>);
		vi.mocked(getFinding).mockResolvedValue({
			$id: "find-1",
			orgId: "org-1",
			documentId: "doc-1",
			title: "Missing policy",
			findingCode: "F-01",
			status: "confirmed",
		} as Awaited<ReturnType<typeof getFinding>>);
		vi.mocked(listCaps).mockResolvedValue([
			{
				$id: "cap-1",
				findingId: "find-1",
				title: "Fix policy gap",
				status: "open",
			},
		] as Awaited<ReturnType<typeof listCaps>>);
		vi.mocked(listFindings).mockResolvedValue([
			{ $id: "find-1", findingCode: "F-01" },
		] as Awaited<ReturnType<typeof listFindings>>);

		const result = await runAuditRemediationResearch({
			ctx,
			remediationContext,
			ragSources: [],
		});

		expect(result.steps.length).toBeGreaterThanOrEqual(4);
		expect(result.answer).toContain("## Summary");
		expect(result.hasExecutableApply).toBe(true);
		expect(result.hasConfirmAction).toBe(false);
		expect(result.sources[0]?.href).toContain("finding-cap-find-1");
	});

	it("uses a short confirm path for draft findings without a CAP", async () => {
		vi.mocked(getAuditDocument).mockResolvedValue({
			$id: "doc-1",
			orgId: "org-1",
			title: "SOC audit",
		} as Awaited<ReturnType<typeof getAuditDocument>>);
		vi.mocked(getFinding).mockResolvedValue({
			$id: "find-1",
			orgId: "org-1",
			documentId: "doc-1",
			title: "Missing policy",
			findingCode: "F-01",
			status: "draft",
		} as Awaited<ReturnType<typeof getFinding>>);
		vi.mocked(listCaps).mockResolvedValue([]);
		vi.mocked(listFindings).mockResolvedValue([]);

		const result = await runAuditRemediationResearch({
			ctx,
			remediationContext: { ...remediationContext, capId: null, capStatus: null },
			ragSources: [],
		});

		expect(result.hasConfirmAction).toBe(true);
		expect(result.hasExecutableApply).toBe(false);
		expect(result.steps.length).toBe(3);
		expect(result.answer).toContain("still a draft");
		expect(result.answer).toContain("Confirm the finding below");
		expect(listFindings).not.toHaveBeenCalled();
	});

	it("handles missing audit with null-result copy", async () => {
		vi.mocked(getAuditDocument).mockResolvedValue(null);
		vi.mocked(getFinding).mockResolvedValue(null);
		vi.mocked(listCaps).mockResolvedValue([]);
		vi.mocked(listFindings).mockResolvedValue([]);

		const result = await runAuditRemediationResearch({
			ctx,
			remediationContext,
			ragSources: [],
		});

		expect(result.hasExecutableApply).toBe(false);
		expect(result.hasConfirmAction).toBe(false);
		expect(result.answer).toContain("could not load");
		expect(result.suggestions.length).toBeGreaterThan(0);
	});

	it("uses fail autonomy copy for physical reconciliation (2026-006-like)", async () => {
		vi.mocked(getAuditDocument).mockResolvedValue({
			$id: "doc-1",
			orgId: "org-1",
			title: "Single audit",
		} as Awaited<ReturnType<typeof getAuditDocument>>);
		vi.mocked(getFinding).mockResolvedValue({
			$id: "find-1",
			orgId: "org-1",
			documentId: "doc-1",
			title: "Equipment inventory not reconciled (repeat of 2025-003)",
			findingCode: "2026-006",
			status: "confirmed",
		} as Awaited<ReturnType<typeof getFinding>>);
		vi.mocked(listCaps).mockResolvedValue([
			{
				$id: "cap-1",
				findingId: "find-1",
				title: "Reconcile equipment register",
				status: "open",
			},
		] as Awaited<ReturnType<typeof listCaps>>);
		vi.mocked(listFindings).mockResolvedValue([
			{ $id: "find-1", findingCode: "2026-006" },
		] as Awaited<ReturnType<typeof listFindings>>);

		const result = await runAuditRemediationResearch({
			ctx,
			remediationContext: {
				findingId: "find-1",
				documentId: "doc-1",
				title: "Equipment inventory not reconciled (repeat of 2025-003)",
				findingCode: "2026-006",
				conditionText:
					"No physical reconciliation of property records to equipment on hand was performed during fiscal 2026.",
				correctiveText:
					"Perform the outstanding physical reconciliation of the equipment register.",
				capId: "cap-1",
				capStatus: "open",
				capTitle: "Reconcile equipment register",
			},
			ragSources: [],
		});

		expect(result.hasExecutableApply).toBe(true);
		expect(result.answer).toMatch(/draft the corrective action|start it for you/i);
		expect(result.answer).toMatch(/physically counted and reconciled/i);
		expect(result.answer).toMatch(/before it can be marked closed/i);
		expect(result.answer).toMatch(/draft\/start tracking|I can draft\/start/i);
		expect(result.answer).not.toMatch(/data correction I can complete/i);
		expect(result.answer).not.toMatch(/\bcompleted the finding\b|\bfixed the finding\b/i);
	});

	it("uses pass autonomy copy for SEFA / mapping-style findings", async () => {
		vi.mocked(getAuditDocument).mockResolvedValue({
			$id: "doc-1",
			orgId: "org-1",
			title: "Single audit",
		} as Awaited<ReturnType<typeof getAuditDocument>>);
		vi.mocked(getFinding).mockResolvedValue({
			$id: "find-1",
			orgId: "org-1",
			documentId: "doc-1",
			title: "SEFA misclassification of CDC award expenditures",
			findingCode: "2026-002",
			status: "confirmed",
		} as Awaited<ReturnType<typeof getFinding>>);
		vi.mocked(listCaps).mockResolvedValue([
			{
				$id: "cap-1",
				findingId: "find-1",
				title: "Remap SEFA awards",
				status: "open",
			},
		] as Awaited<ReturnType<typeof listCaps>>);
		vi.mocked(listFindings).mockResolvedValue([
			{ $id: "find-1", findingCode: "2026-002" },
		] as Awaited<ReturnType<typeof listFindings>>);

		const result = await runAuditRemediationResearch({
			ctx,
			remediationContext: {
				findingId: "find-1",
				documentId: "doc-1",
				title: "SEFA misclassification of CDC award expenditures",
				findingCode: "2026-002",
				conditionText:
					"The schedule of expenditures of federal awards reports expenditures by assistance listing number incorrectly.",
				correctiveText:
					"Map each federal award in the accounting system to its assistance listing number before filing.",
				capId: "cap-1",
				capStatus: "open",
				capTitle: "Remap SEFA awards",
			},
			ragSources: [],
		});

		expect(result.hasExecutableApply).toBe(true);
		expect(result.answer).toMatch(/data correction I can complete/i);
		expect(result.answer).toMatch(/Review the proposed change/i);
		expect(result.answer).not.toMatch(/upload physical/i);
		expect(result.answer).not.toMatch(/physical count/i);
		expect(result.answer).not.toMatch(/physically counted/i);
		expect(result.answer).toMatch(
			/no outside-CAALM evidence step is required/i,
		);
	});
});
