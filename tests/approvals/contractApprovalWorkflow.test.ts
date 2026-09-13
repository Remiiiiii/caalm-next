import { describe, expect, it, vi } from "vitest";
import { isAssigneeMatch } from "@/lib/approvals/assigneeIdentity";
import {
	applyReassignToCurrentStep,
	assertClaimAllowed,
	assertDecisionAllowed,
	assertReassignAllowed,
	assigneeHintForKind,
	buildDerivedSteps,
	needsExecutiveAssignmentFlag,
	resetWorkflowForResubmit,
	resolveStatusAfterApprove,
	resolveViewerCurrentStep,
	syncDepartmentAssigneesIfCurrent,
	upgradeAwaitingExecutiveStep,
	pickExecutiveAssignees,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import { historyFromNotifications } from "@/lib/approvals/approvalHistory";
import { computeViewerCapabilities } from "@/lib/approvals/viewerCapabilities";
import { advanceWorkflowAfterApprove } from "@/lib/approvals/workflowAdvance";
import {
	pickWorkflowTemplate,
	type ApprovalWorkflowTemplate,
} from "@/lib/approvals/workflowTemplates";
import type {
	ApprovalWorkflowNotification,
	ApprovalWorkflowState,
	ApprovalWorkflowStep,
} from "@/lib/approvals/contractApprovalWorkflow.types";

vi.mock("@/lib/config/demo-mode", () => ({
	isDemoMode: () => false,
}));

describe("buildDerivedSteps", () => {
	it("builds submitted → department → executive → activated", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			executiveApproverIds: ["exec-1"],
		});

		expect(steps.map((s) => s.kind)).toEqual([
			"submitted",
			"department_review",
			"executive_approval",
			"activated",
		]);
		expect(steps[0].status).toBe("complete");
		expect(steps[1].status).toBe("current");
		expect(steps[2].assigneeUserIds).toEqual(["exec-1"]);
		expect(steps[2].assigneeUserIds).not.toContain("uploader-1");
		expect(steps[3].assigneeUserIds).toEqual(["exec-1"]);
	});

	it("adds one internal approval node per approver", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			internalApproverIds: ["int-1", "int-2"],
			executiveApproverIds: ["exec-1"],
		});

		const internals = steps.filter((s) => s.kind === "internal_approval");
		expect(internals).toHaveLength(2);
		expect(internals[0].assigneeUserIds).toEqual(["int-1"]);
		expect(internals[1].assigneeUserIds).toEqual(["int-2"]);
	});

	it("excludes uploader from executive and internal steps", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			internalApproverIds: ["uploader-1", "int-1"],
			executiveApproverIds: ["uploader-1", "exec-1"],
		});

		const internals = steps.filter((s) => s.kind === "internal_approval");
		expect(internals).toHaveLength(1);
		expect(internals[0].assigneeUserIds).toEqual(["int-1"]);

		const exec = steps.find((s) => s.kind === "executive_approval");
		expect(exec?.assigneeUserIds).toEqual(["exec-1"]);
	});

	it("shows awaiting_executive when no exec approvers exist", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			executiveApproverIds: [],
		});

		expect(steps.map((s) => s.kind)).toContain("awaiting_executive");
		expect(steps.map((s) => s.kind)).not.toContain("executive_approval");
	});

	it("falls back department assignees to uploader when no managers", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: [],
			executiveApproverIds: ["exec-1"],
		});

		const dept = steps.find((s) => s.kind === "department_review");
		expect(dept?.assigneeUserIds).toEqual(["uploader-1"]);
	});
});

describe("assertDecisionAllowed", () => {
	const currentStep = (
		overrides: Partial<ApprovalWorkflowStep> = {},
	): ApprovalWorkflowStep => ({
		id: "department_review-1",
		kind: "department_review",
		label: "Department review",
		assigneeUserIds: ["mgr-1"],
		status: "current",
		...overrides,
	});

	it("rejects a viewer who is not the current step assignee", () => {
		expect(() =>
			assertDecisionAllowed({
				current: currentStep(),
				viewerUserId: "other-user",
				uploaderUserId: "uploader-1",
			}),
		).toThrow(/not an assignee/);
	});

	it("allows the current step assignee", () => {
		expect(() =>
			assertDecisionAllowed({
				current: currentStep(),
				viewerUserId: "mgr-1",
				uploaderUserId: "uploader-1",
			}),
		).not.toThrow();
	});

	it("blocks uploader from executive self-approval outside demo", () => {
		expect(() =>
			assertDecisionAllowed({
				current: currentStep({
					kind: "executive_approval",
					label: "Executive approval",
					assigneeUserIds: ["uploader-1", "exec-1"],
				}),
				viewerUserId: "uploader-1",
				uploaderUserId: "uploader-1",
			}),
		).toThrow(/Uploader cannot approve/);
	});

	it("blocks submitter from department review (SoD)", () => {
		expect(() =>
			assertDecisionAllowed({
				current: currentStep({ assigneeUserIds: ["uploader-1"] }),
				viewerUserId: "uploader-1",
				uploaderUserId: "uploader-1",
			}),
		).toThrow(/Uploader cannot approve/);
	});

	it("matches assignee by identity alias", () => {
		expect(() =>
			assertDecisionAllowed({
				current: currentStep({ assigneeUserIds: ["acct-1"] }),
				viewerUserId: "row-1",
				uploaderUserId: "uploader-1",
				viewerIdentityIds: ["row-1", "acct-1"],
			}),
		).not.toThrow();
	});

	it("allows admin override for wrong assignee", () => {
		expect(() =>
			assertDecisionAllowed({
				current: currentStep(),
				viewerUserId: "admin-1",
				uploaderUserId: "uploader-1",
				adminOverride: true,
			}),
		).not.toThrow();
	});

	it("blocks deciding awaiting_executive", () => {
		expect(() =>
			assertDecisionAllowed({
				current: currentStep({
					kind: "awaiting_executive",
					label: "Awaiting executive assignment",
					assigneeUserIds: [],
				}),
				viewerUserId: "admin-1",
				uploaderUserId: "uploader-1",
				adminOverride: true,
			}),
		).toThrow(/cannot be decided/);
	});
});

describe("resolveStatusAfterApprove", () => {
	it("keeps pending-review for non-executive approve", () => {
		expect(
			resolveStatusAfterApprove("department_review", "executive_approval"),
		).toBe("pending-review");
	});

	it("activates only on executive approval", () => {
		expect(resolveStatusAfterApprove("executive_approval", "activated")).toBe(
			"active",
		);
	});

	it("holds for signature when digitalSignatureRequired", () => {
		expect(
			resolveStatusAfterApprove("executive_approval", "activated", {
				digitalSignatureRequired: true,
			}),
		).toBe("pending-signature");
	});

	it("blocks activation when next step is activated without executive", () => {
		expect(() =>
			resolveStatusAfterApprove("department_review", "activated"),
		).toThrow(/Executive approval is required/);
	});
});

describe("upgradeAwaitingExecutiveStep", () => {
	it("upgrades awaiting_executive when executives exist", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			executiveApproverIds: [],
		});
		const awaitingIdx = steps.findIndex((s) => s.kind === "awaiting_executive");
		steps[1].status = "complete";
		steps[awaitingIdx].status = "current";
		const state: ApprovalWorkflowState = {
			version: 1,
			currentStepIndex: awaitingIdx,
			derivedAt: new Date().toISOString(),
			steps,
			notifications: [],
		};

		const upgraded = upgradeAwaitingExecutiveStep(state, ["exec-1"]);
		expect(upgraded).not.toBeNull();
		expect(upgraded!.steps[awaitingIdx].kind).toBe("executive_approval");
		expect(upgraded!.steps[awaitingIdx].assigneeUserIds).toEqual(["exec-1"]);
		expect(needsExecutiveAssignmentFlag(upgraded!)).toBe(false);
	});

	it("returns null when no executive ids", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			executiveApproverIds: [],
		});
		const awaitingIdx = steps.findIndex((s) => s.kind === "awaiting_executive");
		steps[awaitingIdx].status = "current";
		const state: ApprovalWorkflowState = {
			version: 1,
			currentStepIndex: awaitingIdx,
			derivedAt: new Date().toISOString(),
			steps,
			notifications: [],
		};
		expect(upgradeAwaitingExecutiveStep(state, [])).toBeNull();
		expect(needsExecutiveAssignmentFlag(state)).toBe(true);
	});
});

describe("resetWorkflowForResubmit", () => {
	it("resets to department review as current", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			executiveApproverIds: ["exec-1"],
		});
		steps[1].status = "changes_requested";
		steps[1].decision = "changes_requested";
		steps[2].status = "pending";
		const state: ApprovalWorkflowState = {
			version: 1,
			currentStepIndex: 1,
			derivedAt: new Date().toISOString(),
			steps,
			notifications: [],
		};
		const reset = resetWorkflowForResubmit(state);
		expect(reset.steps[1].kind).toBe("department_review");
		expect(reset.steps[1].status).toBe("current");
		expect(reset.steps[1].decision).toBeUndefined();
		expect(reset.currentStepIndex).toBe(1);
		expect(reset.steps[2].status).toBe("pending");
	});
});

describe("reassign helpers", () => {
	it("rejects non-admin reassign", () => {
		expect(() =>
			assertReassignAllowed({
				current: {
					id: "department_review-1",
					kind: "department_review",
					label: "Department review",
					assigneeUserIds: ["mgr-1"],
					status: "current",
				},
				adminOverride: false,
			}),
		).toThrow(/Only Super Admin/);
	});

	it("converts awaiting_executive on reassign", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			executiveApproverIds: [],
		});
		const awaitingIdx = steps.findIndex((s) => s.kind === "awaiting_executive");
		steps[awaitingIdx].status = "current";
		const state: ApprovalWorkflowState = {
			version: 1,
			currentStepIndex: awaitingIdx,
			derivedAt: new Date().toISOString(),
			steps,
			notifications: [],
		};
		const next = applyReassignToCurrentStep(state, ["exec-9"]);
		expect(next.steps[awaitingIdx].kind).toBe("executive_approval");
		expect(next.steps[awaitingIdx].assigneeUserIds).toEqual(["exec-9"]);
	});
});

describe("assigneeHintForKind", () => {
	it("labels executive steps for the Executive role", () => {
		expect(assigneeHintForKind("executive_approval")).toMatch(/Executive/);
		expect(assigneeHintForKind("awaiting_executive")).toMatch(/Executive/);
	});
});

describe("syncDepartmentAssigneesIfCurrent", () => {
	it("updates department_review assignees when current", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			executiveApproverIds: ["exec-1"],
		});
		const state: ApprovalWorkflowState = {
			version: 1,
			currentStepIndex: 1,
			derivedAt: new Date().toISOString(),
			steps,
			notifications: [],
		};
		const next = syncDepartmentAssigneesIfCurrent(state, ["mgr-2", "mgr-3"]);
		expect(next?.steps[1].assigneeUserIds).toEqual(["mgr-2", "mgr-3"]);
	});

	it("returns null when current step is not department review", () => {
		const steps = buildDerivedSteps({
			uploaderUserId: "uploader-1",
			departmentManagerIds: ["mgr-1"],
			executiveApproverIds: ["exec-1"],
		});
		steps[1].status = "complete";
		steps[2].status = "current";
		const state: ApprovalWorkflowState = {
			version: 1,
			currentStepIndex: 2,
			derivedAt: new Date().toISOString(),
			steps,
			notifications: [],
		};
		expect(syncDepartmentAssigneesIfCurrent(state, ["mgr-2"])).toBeNull();
	});
});

describe("pickExecutiveAssignees", () => {
	it("keeps only assignees still in the Executive pool", () => {
		expect(
			pickExecutiveAssignees(["victor", "remy", "jimmy"], ["jimmy"]),
		).toEqual(["jimmy"]);
	});

	it("falls back to the full pool when none of the saved assignees qualify", () => {
		expect(
			pickExecutiveAssignees(["victor", "remy"], ["jimmy"]),
		).toEqual(["jimmy"]);
	});

	it("preserves a valid subset without forcing every eligible person", () => {
		expect(
			pickExecutiveAssignees(["jimmy"], ["jimmy", "other-exec"]),
		).toEqual(["jimmy"]);
	});
});

describe("viewer capabilities", () => {
	it("does not treat override as canDecide", () => {
		const flags = computeViewerCapabilities({
			frozen: false,
			current: { kind: "department_review", status: "current" },
			contractStatus: "pending-review",
			isAssignee: false,
			canDecideByRole: true,
			isAdminOverride: true,
		});
		expect(flags.canDecide).toBe(false);
		expect(flags.canDecideAsAssignee).toBe(false);
		expect(flags.canAdminOverrideActiveStep).toBe(true);
		expect(flags.canClaimStep).toBe(true);
	});

	it("hides active decisions when workflow is complete", () => {
		const flags = computeViewerCapabilities({
			frozen: false,
			current: { kind: "activated", status: "complete" },
			contractStatus: "pending-signature",
			isAssignee: true,
			canDecideByRole: true,
			isAdminOverride: true,
		});
		expect(flags.canDecideAsAssignee).toBe(false);
		expect(flags.canAdminOverrideCompleted).toBe(true);
	});

	it("hides reject for REVIEW-only department managers", () => {
		const flags = computeViewerCapabilities({
			frozen: false,
			current: { kind: "department_review", status: "current" },
			contractStatus: "pending-review",
			isAssignee: true,
			canDecideByRole: true,
			isAdminOverride: false,
			canApprove: false,
		});
		expect(flags.canDecideAsAssignee).toBe(true);
		expect(flags.canReject).toBe(false);
	});
});

describe("claim", () => {
	it("rejects an existing assignee", () => {
		expect(() =>
			assertClaimAllowed({
				current: {
					id: "department_review-1",
					kind: "department_review",
					label: "Department review",
					assigneeUserIds: ["mgr-1"],
					status: "current",
				},
				viewerUserId: "mgr-1",
			}),
		).toThrow(/already assigned/);
	});

	it("allows an eligible non-assignee", () => {
		expect(() =>
			assertClaimAllowed({
				current: {
					id: "department_review-1",
					kind: "department_review",
					label: "Department review",
					assigneeUserIds: ["mgr-1"],
					status: "current",
				},
				viewerUserId: "mgr-2",
			}),
		).not.toThrow();
	});
});

describe("identity match", () => {
	it("matches accountId against stored assignee", () => {
		expect(isAssigneeMatch(["acct-1"], ["row-1", "acct-1"])).toBe(true);
		expect(isAssigneeMatch(["acct-1"], ["row-2"])).toBe(false);
	});
});

describe("parallel advance", () => {
	it("holds until sibling steps complete", () => {
		const state = {
			version: 1 as const,
			currentStepIndex: 1,
			derivedAt: new Date().toISOString(),
			notifications: [],
			steps: [
				{
					id: "submitted-0",
					kind: "submitted" as const,
					label: "Submitted",
					assigneeUserIds: ["u1"],
					status: "complete" as const,
				},
				{
					id: "legal-1",
					kind: "internal_approval" as const,
					label: "Legal",
					assigneeUserIds: ["a"],
					status: "complete" as const,
					parallelGroupId: "g1",
				},
				{
					id: "finance-2",
					kind: "internal_approval" as const,
					label: "Finance",
					assigneeUserIds: ["b"],
					status: "current" as const,
					parallelGroupId: "g1",
				},
				{
					id: "exec-3",
					kind: "executive_approval" as const,
					label: "Executive",
					assigneeUserIds: ["e"],
					status: "pending" as const,
				},
			],
		};
		const held = advanceWorkflowAfterApprove(state, 1);
		expect(held.currentStepIndex).toBe(2);
		expect(held.steps[3].status).toBe("pending");
	});

	it("resolves the viewer to their parallel sibling step", () => {
		const state: ApprovalWorkflowState = {
			version: 1,
			currentStepIndex: 1,
			derivedAt: new Date().toISOString(),
			notifications: [],
			steps: [
				{
					id: "submitted-0",
					kind: "submitted",
					label: "Submitted",
					assigneeUserIds: ["u1"],
					status: "complete",
				},
				{
					id: "legal-1",
					kind: "internal_approval",
					label: "Legal",
					assigneeUserIds: ["legal-user"],
					status: "current",
					parallelGroupId: "g1",
				},
				{
					id: "finance-2",
					kind: "internal_approval",
					label: "Finance",
					assigneeUserIds: ["finance-user"],
					status: "current",
					parallelGroupId: "g1",
				},
			],
		};
		const finance = resolveViewerCurrentStep(state, ["finance-user"]);
		expect(finance.index).toBe(2);
		expect(finance.step?.label).toBe("Finance");
		const legal = resolveViewerCurrentStep(state, ["legal-user"]);
		expect(legal.index).toBe(1);
	});

	it("advances past the group when the last sibling completes", () => {
		const state: ApprovalWorkflowState = {
			version: 1,
			currentStepIndex: 2,
			derivedAt: new Date().toISOString(),
			notifications: [],
			steps: [
				{
					id: "submitted-0",
					kind: "submitted",
					label: "Submitted",
					assigneeUserIds: ["u1"],
					status: "complete",
				},
				{
					id: "legal-1",
					kind: "internal_approval",
					label: "Legal",
					assigneeUserIds: ["a"],
					status: "complete",
					parallelGroupId: "g1",
				},
				{
					id: "finance-2",
					kind: "internal_approval",
					label: "Finance",
					assigneeUserIds: ["b"],
					status: "complete",
					parallelGroupId: "g1",
				},
				{
					id: "exec-3",
					kind: "executive_approval",
					label: "Executive",
					assigneeUserIds: ["e"],
					status: "pending",
				},
			],
		};
		const advanced = advanceWorkflowAfterApprove(state, 2);
		expect(advanced.currentStepIndex).toBe(3);
		expect(advanced.steps[3].status).toBe("current");
	});
});

describe("template routing", () => {
	it("picks the first matching value rule", () => {
		const high: ApprovalWorkflowTemplate = {
			$id: "high",
			orgId: "org",
			name: "High value",
			entityType: "contract",
			rules: [{ field: "contractValue", op: "gte", value: 50000 }],
			steps: [],
			isDefault: false,
			isActive: true,
		};
		const fallback: ApprovalWorkflowTemplate = {
			$id: "def",
			orgId: "org",
			name: "Default",
			entityType: "both",
			rules: [],
			steps: [],
			isDefault: true,
			isActive: true,
		};
		expect(
			pickWorkflowTemplate([fallback, high], "contract", { amount: 80000 })
				?.$id,
		).toBe("high");
		expect(
			pickWorkflowTemplate([fallback, high], "contract", { amount: 100 })?.$id,
		).toBe("def");
	});

	it("matches risk tier and contract type rules", () => {
		const risky: ApprovalWorkflowTemplate = {
			$id: "risky",
			orgId: "org",
			name: "High risk",
			entityType: "contract",
			rules: [
				{ field: "riskTier", op: "eq", value: "High" },
				{ field: "contractType", op: "eq", value: "Government" },
			],
			steps: [],
			isDefault: false,
			isActive: true,
		};
		const fallback: ApprovalWorkflowTemplate = {
			$id: "def",
			orgId: "org",
			name: "Default",
			entityType: "both",
			rules: [],
			steps: [],
			isDefault: true,
			isActive: true,
		};
		expect(
			pickWorkflowTemplate([fallback, risky], "contract", {
				riskTier: "High",
				contractType: "Government",
			})?.$id,
		).toBe("risky");
		expect(
			pickWorkflowTemplate([fallback, risky], "contract", {
				riskTier: "Low",
				contractType: "Government",
			})?.$id,
		).toBe("def");
	});
});

describe("history actors", () => {
	it("prefers actorUserId over recipients", () => {
		const notes: ApprovalWorkflowNotification[] = [
			{
				id: "1",
				type: "reassigned",
				sentAt: "2026-01-01T00:00:00.000Z",
				recipientUserIds: ["a", "b"],
				actorUserId: "admin-1",
				reason: "Coverage while manager is OOO",
				detail: "a → b",
				label: "Reassigned: Coverage while manager is OOO",
			},
		];
		const events = historyFromNotifications(notes);
		expect(events[0].actorUserIds).toEqual(["admin-1"]);
		expect(events[0].reason).toBe("Coverage while manager is OOO");
		expect(events[0].detail).toBe("a → b");
	});
});

describe("uploader SoD", () => {
	it("blocks the uploader from approving their own review step", () => {
		expect(() =>
			assertDecisionAllowed({
				current: {
					id: "department_review-1",
					kind: "department_review",
					label: "Department review",
					assigneeUserIds: ["uploader-1"],
					status: "current",
				},
				viewerUserId: "uploader-1",
				uploaderUserId: "uploader-1",
			}),
		).toThrow(/Uploader cannot approve/);
	});
});
