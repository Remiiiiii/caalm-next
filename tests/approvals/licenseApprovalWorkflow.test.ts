import { describe, expect, it, vi } from "vitest";
import { assertDecisionAllowed } from "@/lib/approvals/ContractApprovalWorkflowService";
import { computeViewerCapabilities } from "@/lib/approvals/viewerCapabilities";

vi.mock("@/lib/config/demo-mode", () => ({
	isDemoMode: () => false,
}));

describe("license approval SoD", () => {
	it("blocks the submitter from deciding department review", () => {
		expect(() =>
			assertDecisionAllowed({
				current: {
					id: "department_review-1",
					kind: "department_review",
					label: "Department review",
					assigneeUserIds: ["owner-1"],
					status: "current",
				},
				viewerUserId: "owner-1",
				uploaderUserId: "owner-1",
			}),
		).toThrow(/Uploader cannot approve/);
	});
});

describe("license viewer flags", () => {
	it("enables claim for a role-eligible non-assignee", () => {
		const flags = computeViewerCapabilities({
			frozen: false,
			current: { kind: "department_review", status: "current" },
			contractStatus: "pending-review",
			isAssignee: false,
			canDecideByRole: true,
			isAdminOverride: false,
		});
		expect(flags.canClaimStep).toBe(true);
		expect(flags.canDecideAsAssignee).toBe(false);
		expect(flags.decisionBlockReason).toMatch(/not assigned/);
	});
});
