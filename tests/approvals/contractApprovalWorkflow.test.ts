import { describe, expect, it, vi } from "vitest";
import {
	applyReassignToCurrentStep,
	assertDecisionAllowed,
	assertReassignAllowed,
	assigneeHintForKind,
	buildDerivedSteps,
	needsExecutiveAssignmentFlag,
	resetWorkflowForResubmit,
	resolveStatusAfterApprove,
	syncDepartmentAssigneesIfCurrent,
	upgradeAwaitingExecutiveStep,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import type {
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
	it("labels executive steps for Super Admin / Org Admin", () => {
		expect(assigneeHintForKind("executive_approval")).toMatch(/Super Admin/);
		expect(assigneeHintForKind("awaiting_executive")).toMatch(/Organization Admin/);
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
