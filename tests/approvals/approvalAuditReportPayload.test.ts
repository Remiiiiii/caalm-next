import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApprovalWorkflowViewerPayload } from "@/lib/approvals/contractApprovalWorkflow.types";

vi.mock("@/lib/approvals/ContractApprovalWorkflowService", () => ({
	buildReassignCandidates: vi.fn(async (_orgId: string, stepKind: string) => {
		if (stepKind === "department_review") {
			return [
				{
					userId: "mgr-1",
					fullName: "Jordan Hale",
					email: "jordan@caalm.app",
					roleLabel: "Department Manager",
				},
				{
					userId: "mgr-2",
					fullName: "Alex Rivera",
					email: "alex@caalm.app",
					roleLabel: "Department Manager",
				},
			];
		}
		if (stepKind === "executive_approval" || stepKind === "awaiting_executive") {
			return [
				{
					userId: "exec-1",
					fullName: "Priya Nair",
					email: "priya@caalm.app",
					roleLabel: "Organization Admin",
				},
			];
		}
		return [];
	}),
	resolveParticipant: vi.fn(async (userId: string) => ({
		userId,
		fullName:
			userId === "68ec4642000d7a481510"
				? "Casey Nguyen"
				: "Unknown user",
		email:
			userId === "68ec4642000d7a481510"
				? "casey@caalm.app"
				: undefined,
	})),
}));

import { buildApprovalAuditReportPayload } from "@/lib/approvals/approvalAuditReportPayload";
import { buildReassignCandidates } from "@/lib/approvals/ContractApprovalWorkflowService";

function baseWorkflow(
	overrides: Partial<ApprovalWorkflowViewerPayload> = {},
): ApprovalWorkflowViewerPayload {
	return {
		contractId: "ctr-1",
		contractName: "Sample MSA",
		contractStatus: "pending-signature",
		department: "Legal",
		subDepartment: "Commercial",
		currentStepIndex: 3,
		steps: [
			{
				id: "s0",
				kind: "submitted",
				label: "Submitted",
				assigneeUserIds: ["u-uploader"],
				status: "complete",
				startedAt: "2026-08-31T13:12:00.000Z",
				completedAt: "2026-08-31T13:12:00.000Z",
				assigneeHint: "Uploader",
				participants: [
					{
						userId: "u-uploader",
						fullName: "Maya Chen",
						email: "maya@caalm.app",
					},
				],
				notifications: [
					{
						id: "n0",
						type: "upload_submitted",
						sentAt: "2026-08-31T13:12:00.000Z",
						recipientUserIds: ["u-uploader"],
						label: "Upload submitted",
					},
				],
			},
			{
				id: "s1",
				kind: "department_review",
				label: "Department review",
				assigneeUserIds: ["u-mgr"],
				status: "complete",
				startedAt: "2026-08-31T13:13:00.000Z",
				completedAt: "2026-09-07T20:05:00.000Z",
				assigneeHint: "Assigned department manager",
				participants: [
					{
						userId: "u-mgr",
						fullName: "Jordan Hale",
						email: "jordan@caalm.app",
					},
				],
				notifications: [
					{
						id: "n1",
						type: "pending_review",
						sentAt: "2026-08-31T13:13:00.000Z",
						recipientUserIds: ["u-mgr", "u-uploader"],
						label: "Department review opened",
					},
				],
			},
			{
				id: "s2",
				kind: "executive_approval",
				label: "Executive approval",
				assigneeUserIds: ["u-exec"],
				status: "complete",
				startedAt: "2026-09-07T20:06:00.000Z",
				completedAt: "2026-09-10T15:20:00.000Z",
				assigneeHint: "Super Admin or Organization Admin",
				participants: [
					{
						userId: "u-exec",
						fullName: "Priya Nair",
						email: "priya@caalm.app",
					},
				],
				notifications: [
					{
						id: "n2",
						type: "stage_advanced",
						sentAt: "2026-09-07T20:06:00.000Z",
						recipientUserIds: ["u-exec"],
						label: "Executive step opened",
					},
					{
						id: "n3",
						type: "executive_approved",
						sentAt: "2026-09-10T15:20:00.000Z",
						recipientUserIds: ["u-exec", "u-uploader"],
						label: "Executive approved",
						stepId: "s2",
					},
				],
			},
			{
				id: "s3",
				kind: "activated",
				label: "Activated",
				assigneeUserIds: ["u-exec"],
				status: "complete",
				startedAt: "2026-09-11T12:03:00.000Z",
				completedAt: "2026-09-11T12:03:00.000Z",
				assigneeHint: "Result of executive approval",
				participants: [
					{
						userId: "u-exec",
						fullName: "Priya Nair",
						email: "priya@caalm.app",
					},
				],
				notifications: [
					{
						id: "n4",
						type: "stage_advanced",
						sentAt: "2026-09-11T12:03:00.000Z",
						recipientUserIds: ["u-uploader", "u-mgr", "u-exec"],
						label: "Contract activated",
					},
				],
			},
		],
		notifications: [
			{
				id: "n0",
				type: "upload_submitted",
				sentAt: "2026-08-31T13:12:00.000Z",
				recipientUserIds: ["u-uploader"],
				label: "Upload submitted",
			},
			{
				id: "n1",
				type: "pending_review",
				sentAt: "2026-08-31T13:13:00.000Z",
				recipientUserIds: ["u-mgr"],
				label: "Department review opened",
				stepId: "s1",
			},
			{
				id: "n-claim",
				type: "claimed",
				sentAt: "2026-09-03T18:15:00.000Z",
				recipientUserIds: ["u-mgr"],
				label: "Self-assigned",
				stepId: "s1",
			},
			{
				id: "n3",
				type: "executive_approved",
				sentAt: "2026-09-10T15:20:00.000Z",
				recipientUserIds: ["u-exec"],
				label: "Executive approved",
				stepId: "s2",
			},
			{
				id: "n4",
				type: "stage_advanced",
				sentAt: "2026-09-11T12:03:00.000Z",
				recipientUserIds: ["u-uploader"],
				label: "Contract activated",
				stepId: "s3",
			},
		],
		canDecide: false,
		canOverride: false,
		canDecideAsAssignee: false,
		canClaimStep: false,
		canAdminOverrideActiveStep: false,
		canAdminOverrideCompleted: false,
		canReject: false,
		needsExecutiveAssignment: false,
		canAssignExecutive: false,
		canResubmit: false,
		viewerUserId: "viewer-1",
		uploaderUserId: "u-uploader",
		amount: 420000,
		contractType: "Master services",
		documentNumber: "CTR-2026-1842",
		counterpartyName: "Northwind Logistics LLC",
		renewalTerm: "12 months",
		...overrides,
	};
}

describe("buildApprovalAuditReportPayload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("uses entity-specific details title and excludes cover duplicates", async () => {
		const contract = await buildApprovalAuditReportPayload(baseWorkflow(), {
			entityType: "contract",
			orgId: "org-1",
		});
		expect(contract.sections.details.title).toBe("Contract Details");
		const detailLabels = contract.details.facts.map((f) => f.label.toLowerCase());
		expect(detailLabels).not.toContain("total contract value");
		expect(detailLabels).not.toContain("current status");
		expect(detailLabels).toContain("contract type");
		expect(detailLabels).toContain("counterparty");

		const license = await buildApprovalAuditReportPayload(baseWorkflow(), {
			entityType: "license",
			orgId: "org-1",
		});
		expect(license.sections.details.title).toBe("License Details");
		expect(license.reportTitle).toContain("License");
	});

	it("returns name strings for assigned/notified and eligible with roles", async () => {
		const payload = await buildApprovalAuditReportPayload(baseWorkflow(), {
			entityType: "contract",
			orgId: "org-1",
		});
		expect(buildReassignCandidates).toHaveBeenCalled();

		const dept = payload.stages.find((s) => s.name === "Department Review");
		expect(dept?.assigned).toContain("Jordan Hale");
		expect(dept?.assigned).not.toMatch(/^\d+$/);
		expect(dept?.notified).toContain("Jordan Hale");
		expect(dept?.eligible).toMatch(/Jordan Hale/);
		expect(dept?.eligible).toMatch(/Department Manager/);
		expect(dept?.sla).toMatch(/\d/);

		const activated = payload.stages.find((s) => s.name === "Activated");
		expect(activated?.eligible).toMatch(/System-triggered/i);
		expect(activated?.assigned).toBe("—");
	});

	it("builds timeline takeaway mentioning dominant stage", async () => {
		const payload = await buildApprovalAuditReportPayload(baseWorkflow(), {
			entityType: "contract",
			orgId: "org-1",
		});
		expect(payload.timelineTakeaway).toMatch(/business day/i);
		expect(payload.timelineTakeaway.toLowerCase()).toContain("department");
		expect(payload.timelineTakeaway).toMatch(/%/);
	});

	it("generates SoD note when one person holds multiple functions", async () => {
		const workflow = baseWorkflow({
			uploaderUserId: "u-mgr",
			steps: baseWorkflow().steps.map((step) => {
				if (step.kind === "submitted") {
					return {
						...step,
						assigneeUserIds: ["u-mgr"],
						participants: [
							{
								userId: "u-mgr",
								fullName: "Jordan Hale",
								email: "jordan@other.com",
							},
						],
					};
				}
				return step;
			}),
		});
		// Also put mgr on executive so they appear in multiple functions
		workflow.steps = workflow.steps.map((step) => {
			if (step.kind === "executive_approval") {
				return {
					...step,
					assigneeUserIds: ["u-mgr"],
					participants: [
						{
							userId: "u-mgr",
							fullName: "Jordan Hale",
							email: "jordan@other.com",
						},
					],
				};
			}
			return step;
		});

		const payload = await buildApprovalAuditReportPayload(workflow, {
			entityType: "contract",
			orgId: "org-1",
		});
		expect(payload.details.sodNote).toBeTruthy();
		expect(payload.details.sodNote).toMatch(/Segregation-of-duties note/i);
		expect(payload.details.sodNote).toMatch(/Jordan Hale/);
		expect(payload.cover.flagging[0]).toMatch(/segregation-of-duties/i);
	});

	it("includes footer, status line, and numbered sections", async () => {
		const payload = await buildApprovalAuditReportPayload(baseWorkflow(), {
			entityType: "contract",
			orgId: "org-1",
		});
		expect(payload.footerLine).toMatch(/Approval & Audit Report/);
		expect(payload.footerLine).toMatch(/Sample MSA/);
		expect(payload.workflowStatusLine).toMatch(/Status:/);
		expect(payload.workflowStatusLine).toMatch(/Track:/);
		expect(payload.sections.workflow.number).toBe(1);
		expect(payload.sections.workflow.description).toBeTruthy();
		expect(payload.cover.flaggingIntro).toMatch(/executive meeting/i);
		expect(payload.cover.flagging).toHaveLength(3);
	});

	it("resolves opaque user ids to names instead of rendering raw ids", async () => {
		const opaqueId = "68ec4642000d7a481510";
		const workflow = baseWorkflow();
		workflow.notifications = [
			...workflow.notifications,
			{
				id: "n-opaque",
				type: "pending_review",
				sentAt: "2026-09-10T16:00:00.000Z",
				recipientUserIds: [opaqueId],
				label: "Viewer notified",
				stepId: "s2",
			},
		];
		const exec = workflow.steps.find((s) => s.kind === "executive_approval");
		if (exec) {
			exec.notifications = [
				...(exec.notifications || []),
				{
					id: "n-opaque-step",
					type: "pending_review",
					sentAt: "2026-09-10T16:00:00.000Z",
					recipientUserIds: [opaqueId],
					label: "Viewer notified",
					stepId: "s2",
				},
			];
		}

		const payload = await buildApprovalAuditReportPayload(workflow, {
			entityType: "contract",
			orgId: "org-1",
		});

		expect(payload.details.parties.some((p) => p.name === opaqueId)).toBe(
			false,
		);
		expect(
			payload.details.parties.some((p) => p.name === "Casey Nguyen"),
		).toBe(true);
		const execStage = payload.stages.find((s) => s.name === "Executive Approval");
		expect(execStage?.notified).toContain("Casey Nguyen");
		expect(execStage?.notified).not.toContain(opaqueId);
	});

	it("writes human-readable audit Detail cells", async () => {
		const payload = await buildApprovalAuditReportPayload(baseWorkflow(), {
			entityType: "contract",
			orgId: "org-1",
		});
		const details = payload.audit.map((row) => row.detail);
		expect(details.some((d) => /recorded for step/i.test(d))).toBe(false);
		expect(details).toContain("Uploader; initiated approval workflow");
		expect(
			details.some((d) => d.startsWith("Assigned: Jordan Hale")),
		).toBe(true);
		expect(
			details.some((d) =>
				d.includes("No note attached (notes optional on Approve)"),
			),
		).toBe(true);
		expect(
			details.some((d) =>
				d.includes("Result of executive approval; status →"),
			),
		).toBe(true);
	});
});
