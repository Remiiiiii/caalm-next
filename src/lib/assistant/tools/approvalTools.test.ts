import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getRow = vi.fn();
const getWorkflowForViewer = vi.fn();
const decide = vi.fn();
const reassignCurrentStep = vi.fn();
const overrideCompletedWorkflow = vi.fn();
const getLicenseWorkflowForViewer = vi.fn();
const decideLicense = vi.fn();
const reassignLicenseCurrentStep = vi.fn();
const overrideCompletedLicenseWorkflow = vi.fn();
const searchContractsTable = vi.fn();
const searchLicensesTable = vi.fn();
const logAuditEvent = vi.fn();

vi.mock("@/lib/appwrite", () => ({
	createAdminClient: async () => ({ tablesDB: { getRow } }),
}));
vi.mock("@/lib/approvals/ContractApprovalWorkflowService", () => ({
	getWorkflowForViewer: (...args: unknown[]) => getWorkflowForViewer(...args),
	decide: (...args: unknown[]) => decide(...args),
	reassignCurrentStep: (...args: unknown[]) => reassignCurrentStep(...args),
	overrideCompletedWorkflow: (...args: unknown[]) =>
		overrideCompletedWorkflow(...args),
}));
vi.mock("@/lib/approvals/LicenseApprovalWorkflowService", () => ({
	getLicenseWorkflowForViewer: (...args: unknown[]) =>
		getLicenseWorkflowForViewer(...args),
	decideLicense: (...args: unknown[]) => decideLicense(...args),
	reassignLicenseCurrentStep: (...args: unknown[]) =>
		reassignLicenseCurrentStep(...args),
	overrideCompletedLicenseWorkflow: (...args: unknown[]) =>
		overrideCompletedLicenseWorkflow(...args),
}));
vi.mock("@/lib/assistant/tools/toolUtils", () => ({
	hasAll: (c: { permissions: string[] }, keys: string[]) =>
		keys.every((k) => c.permissions.includes(k)),
	searchContractsTable: (...args: unknown[]) => searchContractsTable(...args),
	searchLicensesTable: (...args: unknown[]) => searchLicensesTable(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));

const { APPROVAL_TOOLS } = await import("./approvalTools");

function tool(name: string) {
	const found = APPROVAL_TOOLS.find((item) => item.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[], extra?: { userId?: string }) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: {
			$id: extra?.userId ?? "admin-1",
			email: "admin@org.test",
			name: "Admin",
		},
	} as unknown as Parameters<(typeof APPROVAL_TOOLS)[number]["handler"]>[0];
}

const contractRow = { $id: "c-1", orgId: "org-1", contractName: "Vendor Deal" };

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

describe("APPROVAL_TOOLS", () => {
	beforeEach(() => {
		getRow.mockReset();
		getWorkflowForViewer.mockReset();
		decide.mockReset();
		reassignCurrentStep.mockReset();
		overrideCompletedWorkflow.mockReset();
		getLicenseWorkflowForViewer.mockReset();
		decideLicense.mockReset();
		reassignLicenseCurrentStep.mockReset();
		overrideCompletedLicenseWorkflow.mockReset();
		searchContractsTable.mockReset();
		searchLicensesTable.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("get_approval", () => {
		it("rejects an invalid resourceType", async () => {
			const res = await tool("get_approval").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ resourceType: "invoice", id: "c-1" },
			);
			expect(errorOf(res)).toMatch(/resourceType/i);
		});

		it("blocks without view permission for that resource type", async () => {
			const res = await tool("get_approval").handler(ctx([]), {
				resourceType: "contract",
				id: "c-1",
			});
			expect(errorOf(res)).toMatch(/cannot view/i);
			expect(getWorkflowForViewer).not.toHaveBeenCalled();
		});

		it("denies a contract from another org", async () => {
			getRow.mockResolvedValueOnce({ ...contractRow, orgId: "org-2" });
			const res = await tool("get_approval").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ resourceType: "contract", id: "c-1" },
			);
			expect(errorOf(res)).toMatch(/no contract found/i);
		});

		it("returns the workflow payload for an org match", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			getWorkflowForViewer.mockResolvedValueOnce({
				contractStatus: "pending-review",
				steps: [],
			});
			const res = await tool("get_approval").handler(
				ctx([PERMISSIONS.CONTRACTS.VIEW]),
				{ resourceType: "contract", id: "c-1" },
			);
			expect(getWorkflowForViewer).toHaveBeenCalledWith("c-1", "admin-1", {
				isAdminOverride: false,
			});
			expect((res.result as { resourceType: string }).resourceType).toBe(
				"contract",
			);
		});
	});

	describe("approve_request", () => {
		it("blocks without the approve permission for that resource type", async () => {
			const res = await tool("approve_request").handler(ctx([]), {
				resourceType: "contract",
				id: "c-1",
				decision: "approved",
			});
			expect(errorOf(res)).toMatch(/cannot approve/i);
			expect(decide).not.toHaveBeenCalled();
		});

		it("requires notes to reject or request changes", async () => {
			const res = await tool("approve_request").handler(
				ctx([PERMISSIONS.CONTRACTS.APPROVE]),
				{ resourceType: "contract", id: "c-1", decision: "rejected" },
			);
			expect(errorOf(res)).toMatch(/notes/i);
			expect(decide).not.toHaveBeenCalled();
		});

		it("denies when the viewer is not the step assignee", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			getWorkflowForViewer.mockResolvedValueOnce({
				canDecideAsAssignee: false,
				canReject: true,
			});
			const res = await tool("approve_request").handler(
				ctx([PERMISSIONS.CONTRACTS.APPROVE]),
				{ resourceType: "contract", id: "c-1", decision: "approved" },
			);
			expect(errorOf(res)).toMatch(/not the assignee/i);
			expect(decide).not.toHaveBeenCalled();
		});

		it("records the decision for a contract and audits", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			getWorkflowForViewer.mockResolvedValueOnce({
				canDecideAsAssignee: true,
				canReject: true,
			});
			decide.mockResolvedValueOnce({ contractStatus: "active" });
			const res = await tool("approve_request").handler(
				ctx([PERMISSIONS.CONTRACTS.APPROVE]),
				{ resourceType: "contract", id: "c-1", decision: "approved" },
			);
			expect(decide).toHaveBeenCalledWith(
				expect.objectContaining({ contractId: "c-1", decision: "approved" }),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					module: "contracts",
					action: "approval_decided",
				}),
			);
			expect((res.result as { status: string }).status).toBe("active");
		});

		it("dispatches to the license workflow for resourceType license", async () => {
			getRow.mockResolvedValueOnce({ $id: "l-1", orgId: "org-1" });
			getLicenseWorkflowForViewer.mockResolvedValueOnce({
				canDecideAsAssignee: true,
				canReject: true,
			});
			decideLicense.mockResolvedValueOnce({ contractStatus: "active" });
			await tool("approve_request").handler(
				ctx([PERMISSIONS.LICENSES.APPROVE]),
				{ resourceType: "license", id: "l-1", decision: "approved" },
			);
			expect(decideLicense).toHaveBeenCalledWith(
				expect.objectContaining({ licenseId: "l-1", decision: "approved" }),
			);
			expect(decide).not.toHaveBeenCalled();
		});
	});

	describe("reassign_approval", () => {
		it("blocks without approvals.override", async () => {
			const res = await tool("reassign_approval").handler(ctx([]), {
				resourceType: "contract",
				id: "c-1",
				assigneeUserIds: ["u-2"],
				reason: "out of office this week",
			});
			expect(errorOf(res)).toMatch(/super admin|organization admin/i);
			expect(reassignCurrentStep).not.toHaveBeenCalled();
		});

		it("requires a reason of at least 10 characters", async () => {
			const res = await tool("reassign_approval").handler(
				ctx([PERMISSIONS.APPROVALS.OVERRIDE]),
				{
					resourceType: "contract",
					id: "c-1",
					assigneeUserIds: ["u-2"],
					reason: "short",
				},
			);
			expect(errorOf(res)).toMatch(/reason/i);
			expect(reassignCurrentStep).not.toHaveBeenCalled();
		});

		it("reassigns the current step and audits", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			reassignCurrentStep.mockResolvedValueOnce({});
			const res = await tool("reassign_approval").handler(
				ctx([PERMISSIONS.APPROVALS.OVERRIDE]),
				{
					resourceType: "contract",
					id: "c-1",
					assigneeUserIds: ["u-2"],
					reason: "out of office this week",
				},
			);
			expect(reassignCurrentStep).toHaveBeenCalledWith(
				expect.objectContaining({
					contractId: "c-1",
					assigneeUserIds: ["u-2"],
					adminOverride: true,
				}),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ action: "approval_reassigned" }),
			);
			expect((res.result as { reassigned: boolean }).reassigned).toBe(true);
		});
	});

	describe("override_approval", () => {
		it("blocks without approvals.override", async () => {
			const res = await tool("override_approval").handler(ctx([]), {
				resourceType: "contract",
				id: "c-1",
				decision: "rejected",
				notes: "fraud concern",
			});
			expect(errorOf(res)).toMatch(/approvals\.override/i);
			expect(decide).not.toHaveBeenCalled();
			expect(overrideCompletedWorkflow).not.toHaveBeenCalled();
		});

		it("requires notes", async () => {
			const res = await tool("override_approval").handler(
				ctx([PERMISSIONS.APPROVALS.OVERRIDE]),
				{ resourceType: "contract", id: "c-1", decision: "rejected" },
			);
			expect(errorOf(res)).toMatch(/notes/i);
		});

		it("refuses to approve a completed workflow override", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			getWorkflowForViewer.mockResolvedValueOnce({
				canAdminOverrideCompleted: true,
			});
			const res = await tool("override_approval").handler(
				ctx([PERMISSIONS.APPROVALS.OVERRIDE]),
				{
					resourceType: "contract",
					id: "c-1",
					decision: "approved",
					notes: "reopening",
				},
			);
			expect(errorOf(res)).toMatch(/can only be rejected/i);
			expect(overrideCompletedWorkflow).not.toHaveBeenCalled();
		});

		it("overrides a completed workflow and audits", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			getWorkflowForViewer.mockResolvedValueOnce({
				canAdminOverrideCompleted: true,
			});
			overrideCompletedWorkflow.mockResolvedValueOnce({
				contractStatus: "inactive",
			});
			const res = await tool("override_approval").handler(
				ctx([PERMISSIONS.APPROVALS.OVERRIDE]),
				{
					resourceType: "contract",
					id: "c-1",
					decision: "rejected",
					notes: "fraud concern",
				},
			);
			expect(overrideCompletedWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ contractId: "c-1", decision: "rejected" }),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ action: "approval_decided" }),
			);
			expect((res.result as { status: string }).status).toBe("inactive");
		});

		it("overrides an active step via decide(adminOverride:true) when not completed", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			getWorkflowForViewer.mockResolvedValueOnce({
				canAdminOverrideCompleted: false,
				canAdminOverrideActiveStep: true,
			});
			decide.mockResolvedValueOnce({ contractStatus: "active" });
			const res = await tool("override_approval").handler(
				ctx([PERMISSIONS.APPROVALS.OVERRIDE]),
				{
					resourceType: "contract",
					id: "c-1",
					decision: "approved",
					notes: "skip ahead",
				},
			);
			expect(decide).toHaveBeenCalledWith(
				expect.objectContaining({
					contractId: "c-1",
					decision: "approved",
					adminOverride: true,
				}),
			);
			expect((res.result as { status: string }).status).toBe("active");
		});

		it("errors when there is nothing to override", async () => {
			getRow.mockResolvedValueOnce(contractRow);
			getWorkflowForViewer.mockResolvedValueOnce({
				canAdminOverrideCompleted: false,
				canAdminOverrideActiveStep: false,
			});
			const res = await tool("override_approval").handler(
				ctx([PERMISSIONS.APPROVALS.OVERRIDE]),
				{
					resourceType: "contract",
					id: "c-1",
					decision: "rejected",
					notes: "n/a",
				},
			);
			expect(errorOf(res)).toMatch(/no active or completed/i);
		});
	});
});
