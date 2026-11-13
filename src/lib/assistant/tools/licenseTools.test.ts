import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getLicenseByIdForOrg = vi.fn();
const createLicense = vi.fn();
const updateLicense = vi.fn();
const renewLicense = vi.fn();
const searchLicensesTable = vi.fn();
const getLicenseWorkflowForViewer = vi.fn();
const decideLicense = vi.fn();
const extractLicenseFromDocument = vi.fn();
const logAuditEvent = vi.fn();
const invalidateLicenses = vi.fn();
const fetchMock = vi.fn();
const consumeAiExtractionForOrg = vi.fn();
const getExpiringLicenses = vi.fn();
const getUserByEmail = vi.fn();
const transferLicenseOwnership = vi.fn();

vi.mock("@/lib/api/licenses/services/LicenseService", () => ({
	LicenseService: {
		getLicenseByIdForOrg: (...args: unknown[]) => getLicenseByIdForOrg(...args),
		createLicense: (...args: unknown[]) => createLicense(...args),
		updateLicense: (...args: unknown[]) => updateLicense(...args),
		renewLicense: (...args: unknown[]) => renewLicense(...args),
		getExpiringLicenses: (...args: unknown[]) => getExpiringLicenses(...args),
	},
}));
vi.mock("@/lib/actions/user.actions", () => ({
	getUserByEmail: (...args: unknown[]) => getUserByEmail(...args),
}));
vi.mock("@/lib/ownership/transfer.service", () => ({
	transferLicenseOwnership: (...args: unknown[]) =>
		transferLicenseOwnership(...args),
}));
vi.mock("@/lib/approvals/LicenseApprovalWorkflowService", () => ({
	getLicenseWorkflowForViewer: (...args: unknown[]) =>
		getLicenseWorkflowForViewer(...args),
	decideLicense: (...args: unknown[]) => decideLicense(...args),
}));
vi.mock("@/lib/ai/extractLicenseFromDocument", () => ({
	extractLicenseFromDocument: (...args: unknown[]) =>
		extractLicenseFromDocument(...args),
}));
vi.mock("@/lib/assistant/tools/toolUtils", () => ({
	hasAll: (c: { permissions: string[] }, keys: string[]) =>
		keys.every((k) => c.permissions.includes(k)),
	searchLicensesTable: (...args: unknown[]) => searchLicensesTable(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));
vi.mock("@/lib/services/cache-manager", () => ({
	default: {
		invalidateLicenses: (...args: unknown[]) => invalidateLicenses(...args),
	},
}));
vi.mock("@/lib/billing/consumeAiExtractionForRequest", () => ({
	consumeAiExtractionForOrg: (...args: unknown[]) =>
		consumeAiExtractionForOrg(...args),
}));
vi.mock("@/lib/utils", () => ({
	constructFileUrl: (id: string) => `https://files.example.test/${id}`,
}));

global.fetch = fetchMock as unknown as typeof fetch;

const { LICENSE_TOOLS } = await import("./licenseTools");

function tool(name: string) {
	const found = LICENSE_TOOLS.find((item) => item.name === name);
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
	} as unknown as Parameters<(typeof LICENSE_TOOLS)[number]["handler"]>[0];
}

const licenseRow = {
	$id: "l-1",
	orgId: "org-1",
	licenseName: "State Operating License",
	fileId: "file-1",
};

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

describe("LICENSE_TOOLS", () => {
	beforeEach(() => {
		getLicenseByIdForOrg.mockReset();
		createLicense.mockReset();
		updateLicense.mockReset();
		renewLicense.mockReset();
		searchLicensesTable.mockReset();
		getLicenseWorkflowForViewer.mockReset();
		decideLicense.mockReset();
		extractLicenseFromDocument.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
		invalidateLicenses.mockReset().mockResolvedValue(undefined);
		fetchMock.mockReset();
		consumeAiExtractionForOrg
			.mockReset()
			.mockResolvedValue({ used: 1, limit: 10 });
		getExpiringLicenses.mockReset();
		getUserByEmail.mockReset();
		transferLicenseOwnership.mockReset();
	});

	describe("get_license", () => {
		it("blocks without licenses.view", async () => {
			const res = await tool("get_license").handler(ctx([]), {
				licenseId: "l-1",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(getLicenseByIdForOrg).not.toHaveBeenCalled();
		});

		it("denies a license from another org", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce({
				...licenseRow,
				orgId: "org-2",
			});
			const res = await tool("get_license").handler(
				ctx([PERMISSIONS.LICENSES.VIEW]),
				{ licenseId: "l-1" },
			);
			expect(errorOf(res)).toMatch(/no license found/i);
		});

		it("returns the full record for the caller's org", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce(licenseRow);
			const res = await tool("get_license").handler(
				ctx([PERMISSIONS.LICENSES.VIEW]),
				{ licenseId: "l-1" },
			);
			expect(getLicenseByIdForOrg).toHaveBeenCalledWith("l-1", "org-1");
			expect((res.result as { license: unknown }).license).toMatchObject({
				$id: "l-1",
			});
		});

		it("resolves a single fuzzy match and reports ambiguity", async () => {
			searchLicensesTable.mockResolvedValueOnce([
				{ id: "l-1", name: "A" },
				{ id: "l-2", name: "B" },
			]);
			const res = await tool("get_license").handler(
				ctx([PERMISSIONS.LICENSES.VIEW]),
				{ query: "license" },
			);
			expect(errorOf(res)).toMatch(/several licenses/i);
		});
	});

	describe("create_license", () => {
		const fields = {
			licenseName: "Food Permit",
			division: "Ops",
			department: "Facilities",
		};

		it("blocks without licenses.create", async () => {
			const res = await tool("create_license").handler(ctx([]), fields);
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(createLicense).not.toHaveBeenCalled();
		});

		it("rejects missing required fields", async () => {
			const res = await tool("create_license").handler(
				ctx([PERMISSIONS.LICENSES.CREATE]),
				{ licenseName: "Food Permit" },
			);
			expect(errorOf(res)).toMatch(/invalid license fields/i);
			expect(createLicense).not.toHaveBeenCalled();
		});

		it("creates a license and audits", async () => {
			createLicense.mockResolvedValueOnce({
				$id: "l-9",
				licenseName: "Food Permit",
			});
			const res = await tool("create_license").handler(
				ctx([PERMISSIONS.LICENSES.CREATE]),
				fields,
			);
			expect(createLicense).toHaveBeenCalledWith(
				"admin-1",
				expect.objectContaining({ licenseName: "Food Permit" }),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ module: "licenses", action: "create" }),
			);
			expect((res.result as { licenseId: string }).licenseId).toBe("l-9");
		});

		it("updating needs licenses.edit and is org-scoped", async () => {
			const noEdit = await tool("create_license").handler(
				ctx([PERMISSIONS.LICENSES.CREATE]),
				{ licenseId: "l-1", notes: "x" },
			);
			expect(errorOf(noEdit)).toMatch(/licenses\.edit/);

			getLicenseByIdForOrg.mockResolvedValueOnce({
				...licenseRow,
				orgId: "org-2",
			});
			const cross = await tool("create_license").handler(
				ctx([PERMISSIONS.LICENSES.CREATE, PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1", notes: "x" },
			);
			expect(errorOf(cross)).toMatch(/no license found/i);
			expect(updateLicense).not.toHaveBeenCalled();
		});

		it("updates an existing license and audits", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce(licenseRow);
			updateLicense.mockResolvedValueOnce(licenseRow);
			await tool("create_license").handler(
				ctx([PERMISSIONS.LICENSES.CREATE, PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1", notes: "updated" },
			);
			expect(updateLicense).toHaveBeenCalledWith(
				"l-1",
				expect.objectContaining({ notes: "updated" }),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ module: "licenses", action: "update" }),
			);
		});
	});

	describe("renew_license", () => {
		it("blocks without licenses.edit", async () => {
			const res = await tool("renew_license").handler(ctx([]), {
				licenseId: "l-1",
				renewalDate: "2027-01-01",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(renewLicense).not.toHaveBeenCalled();
		});

		it("rejects an invalid renewal date", async () => {
			const res = await tool("renew_license").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1", renewalDate: "nope" },
			);
			expect(errorOf(res)).toMatch(/renewal date/i);
		});

		it("denies a license from another org", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce({
				...licenseRow,
				orgId: "org-2",
			});
			const res = await tool("renew_license").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1", renewalDate: "2027-01-01" },
			);
			expect(errorOf(res)).toMatch(/no license found/i);
			expect(renewLicense).not.toHaveBeenCalled();
		});

		it("renews and audits", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce(licenseRow);
			renewLicense.mockResolvedValueOnce(licenseRow);
			const res = await tool("renew_license").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1", renewalDate: "2027-01-01", cost: "100" },
			);
			expect(renewLicense).toHaveBeenCalledWith(
				"l-1",
				expect.objectContaining({
					renewalDate: "2027-01-01",
					cost: 100,
					renewedBy: "admin-1",
				}),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ module: "licenses" }),
			);
			expect((res.result as { renewed: boolean }).renewed).toBe(true);
		});
	});

	describe("approve_license", () => {
		it("blocks without licenses.approve", async () => {
			const res = await tool("approve_license").handler(ctx([]), {
				licenseId: "l-1",
				decision: "approved",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(decideLicense).not.toHaveBeenCalled();
		});

		it("rejects an invalid decision and missing notes", async () => {
			const bad = await tool("approve_license").handler(
				ctx([PERMISSIONS.LICENSES.APPROVE]),
				{ licenseId: "l-1", decision: "maybe" },
			);
			expect(errorOf(bad)).toMatch(/decision/i);
			const noNotes = await tool("approve_license").handler(
				ctx([PERMISSIONS.LICENSES.APPROVE]),
				{ licenseId: "l-1", decision: "rejected" },
			);
			expect(errorOf(noNotes)).toMatch(/notes/i);
		});

		it("denies when the viewer is not the step assignee (no admin override)", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce(licenseRow);
			getLicenseWorkflowForViewer.mockResolvedValueOnce({
				canDecideAsAssignee: false,
				canAdminOverrideActiveStep: true,
				canAdminOverrideCompleted: true,
				canReject: true,
			});
			const res = await tool("approve_license").handler(
				ctx([PERMISSIONS.LICENSES.APPROVE]),
				{ licenseId: "l-1", decision: "approved" },
			);
			expect(errorOf(res)).toMatch(/not the assignee/i);
			expect(getLicenseWorkflowForViewer).toHaveBeenCalledWith(
				"l-1",
				"admin-1",
				{ isAdminOverride: false },
			);
			expect(decideLicense).not.toHaveBeenCalled();
		});

		it("records the decision and audits", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce(licenseRow);
			getLicenseWorkflowForViewer.mockResolvedValueOnce({
				canDecideAsAssignee: true,
				canReject: true,
			});
			decideLicense.mockResolvedValueOnce({
				state: {},
				contractStatus: "active",
			});
			const res = await tool("approve_license").handler(
				ctx([PERMISSIONS.LICENSES.APPROVE]),
				{ licenseId: "l-1", decision: "approved" },
			);
			expect(decideLicense).toHaveBeenCalledWith(
				expect.objectContaining({ licenseId: "l-1", decision: "approved" }),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ module: "licenses" }),
			);
			expect((res.result as { licenseStatus: string }).licenseStatus).toBe(
				"active",
			);
		});
	});

	describe("extract_license_from_document", () => {
		it("blocks without licenses.edit", async () => {
			const res = await tool("extract_license_from_document").handler(ctx([]), {
				licenseId: "l-1",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("denies a license from another org", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce({
				...licenseRow,
				orgId: "org-2",
			});
			const res = await tool("extract_license_from_document").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1" },
			);
			expect(errorOf(res)).toMatch(/no license found/i);
			expect(extractLicenseFromDocument).not.toHaveBeenCalled();
		});

		it("asks for manual entry when no file is attached", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce({
				...licenseRow,
				fileId: "",
			});
			const res = await tool("extract_license_from_document").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1" },
			);
			expect(errorOf(res)).toMatch(/manually/i);
		});

		it("returns fields for review and saves nothing", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce(licenseRow);
			fetchMock.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
				headers: new Headers({ "content-type": "application/pdf" }),
			});
			extractLicenseFromDocument.mockResolvedValueOnce({
				extractedData: { licenseNumber: "A-1" },
			});
			const res = await tool("extract_license_from_document").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1" },
			);
			expect(extractLicenseFromDocument).toHaveBeenCalled();
			const result = res.result as {
				extractedData: unknown;
				message: string;
			};
			expect(result.extractedData).toEqual({ licenseNumber: "A-1" });
			expect(result.message).toMatch(/nothing was saved/i);
			expect(tool("extract_license_from_document").mutating).toBe(false);
			expect(updateLicense).not.toHaveBeenCalled();
			expect(createLicense).not.toHaveBeenCalled();
			expect(logAuditEvent).not.toHaveBeenCalled();
			expect(consumeAiExtractionForOrg).toHaveBeenCalledWith("org-1");
		});

		it("stops with a plain message when the AI quota is used up", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce(licenseRow);
			fetchMock.mockResolvedValueOnce({
				ok: true,
				arrayBuffer: async () => new ArrayBuffer(4),
				headers: new Headers(),
			});
			consumeAiExtractionForOrg.mockRejectedValueOnce(
				Object.assign(new Error("Monthly AI extraction limit reached."), {
					code: "PLAN_LIMIT_EXCEEDED",
				}),
			);
			const res = await tool("extract_license_from_document").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1" },
			);
			expect(errorOf(res)).toMatch(/limit/i);
			expect(extractLicenseFromDocument).not.toHaveBeenCalled();
		});
	});

	describe("list_license_expirations", () => {
		it("blocks without licenses.view", async () => {
			const res = await tool("list_license_expirations").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(getExpiringLicenses).not.toHaveBeenCalled();
		});

		it("rejects a non-positive days value", async () => {
			const res = await tool("list_license_expirations").handler(
				ctx([PERMISSIONS.LICENSES.VIEW]),
				{ days: 0 },
			);
			expect(errorOf(res)).toMatch(/days/i);
			expect(getExpiringLicenses).not.toHaveBeenCalled();
		});

		it("defaults to 30 days and returns the org-scoped list", async () => {
			getExpiringLicenses.mockResolvedValueOnce([licenseRow]);
			const res = await tool("list_license_expirations").handler(
				ctx([PERMISSIONS.LICENSES.VIEW]),
				{},
			);
			expect(getExpiringLicenses).toHaveBeenCalledWith("org-1", 30);
			const result = res.result as { count: number; days: number };
			expect(result.count).toBe(1);
			expect(result.days).toBe(30);
		});
	});

	describe("assign_license_owner", () => {
		it("blocks without licenses.edit", async () => {
			const res = await tool("assign_license_owner").handler(ctx([]), {
				licenseId: "l-1",
				toUserId: "u-2",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(transferLicenseOwnership).not.toHaveBeenCalled();
		});

		it("requires a target user id or email", async () => {
			const res = await tool("assign_license_owner").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1" },
			);
			expect(errorOf(res)).toMatch(/user id or email/i);
			expect(transferLicenseOwnership).not.toHaveBeenCalled();
		});

		it("resolves the target by email when no user id is given", async () => {
			getUserByEmail.mockResolvedValueOnce({ $id: "u-2" });
			getLicenseByIdForOrg.mockResolvedValueOnce(licenseRow);
			transferLicenseOwnership.mockResolvedValueOnce({
				fromUserId: "u-1",
				toUserId: "u-2",
			});
			const res = await tool("assign_license_owner").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1", toUserEmail: "new.owner@org.test" },
			);
			expect(getUserByEmail).toHaveBeenCalledWith("new.owner@org.test");
			expect(transferLicenseOwnership).toHaveBeenCalledWith(
				expect.objectContaining({
					licenseId: "l-1",
					orgId: "org-1",
					toUserId: "u-2",
					actorUserId: "admin-1",
				}),
			);
			expect(logAuditEvent).toHaveBeenCalledWith(
				expect.objectContaining({ module: "licenses" }),
			);
			const result = res.result as { reassigned: boolean };
			expect(result.reassigned).toBe(true);
		});

		it("errors when no user matches the given email", async () => {
			getUserByEmail.mockResolvedValueOnce(null);
			const res = await tool("assign_license_owner").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1", toUserEmail: "nope@org.test" },
			);
			expect(errorOf(res)).toMatch(/no user found/i);
			expect(transferLicenseOwnership).not.toHaveBeenCalled();
		});

		it("denies a license from another org", async () => {
			getLicenseByIdForOrg.mockResolvedValueOnce({
				...licenseRow,
				orgId: "org-2",
			});
			const res = await tool("assign_license_owner").handler(
				ctx([PERMISSIONS.LICENSES.EDIT]),
				{ licenseId: "l-1", toUserId: "u-2" },
			);
			expect(errorOf(res)).toMatch(/no license found/i);
			expect(transferLicenseOwnership).not.toHaveBeenCalled();
		});
	});
});
