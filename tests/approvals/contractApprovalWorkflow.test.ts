import { describe, expect, it } from "vitest";
import {
	assertDecisionAllowed,
	buildDerivedSteps,
	resolveStatusAfterApprove,
} from "@/lib/approvals/ContractApprovalWorkflowService";
import type { ApprovalWorkflowStep } from "@/lib/approvals/contractApprovalWorkflow.types";

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

	it("blocks uploader from executive self-approval", () => {
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
