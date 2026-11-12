import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getAuditDocument = vi.fn();
const listAuditDocuments = vi.fn();
const getFinding = vi.fn();
const listFindings = vi.fn();
const updateFinding = vi.fn();
const createCap = vi.fn();
const getCap = vi.fn();
const listCaps = vi.fn();
const updateCap = vi.fn();
const logAuditUploadEvent = vi.fn();

vi.mock("@/lib/audit-upload/store", () => ({
	getAuditDocument: (...args: unknown[]) => getAuditDocument(...args),
	listAuditDocuments: (...args: unknown[]) => listAuditDocuments(...args),
	getFinding: (...args: unknown[]) => getFinding(...args),
	listFindings: (...args: unknown[]) => listFindings(...args),
	updateFinding: (...args: unknown[]) => updateFinding(...args),
	createCap: (...args: unknown[]) => createCap(...args),
	getCap: (...args: unknown[]) => getCap(...args),
	listCaps: (...args: unknown[]) => listCaps(...args),
	updateCap: (...args: unknown[]) => updateCap(...args),
}));
vi.mock("@/lib/audit-upload/audit-log", () => ({
	logAuditUploadEvent: (...args: unknown[]) => logAuditUploadEvent(...args),
}));
vi.mock("@/lib/audit-upload/confirm-finding", () => ({
	confirmAuditFinding: vi.fn(),
}));
vi.mock("@/lib/services/audit-logger", () => ({ getAuditLogs: vi.fn() }));

const { AUDIT_TOOLS } = await import("./auditTools");

function tool(name: string) {
	const found = AUDIT_TOOLS.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "admin-1", email: "admin@org.test", name: "Admin" },
	} as unknown as Parameters<(typeof AUDIT_TOOLS)[number]["handler"]>[0];
}

const errorOf = (res: { result?: unknown }) =>
	(res.result as { error?: string }).error;

const findingRow = {
	$id: "f-1",
	orgId: "org-1",
	documentId: "doc-1",
	title: "Access review gap",
	description: "...",
	severityComputed: "high",
	status: "confirmed",
	correctionObligations: [],
};

const capRow = {
	$id: "cap-1",
	orgId: "org-1",
	findingId: "f-1",
	title: "Correct: Access review gap",
	assigneeId: null,
	dueAt: "2027-01-01",
};

describe("AUDIT_TOOLS CAPA depth (6.1-6.5)", () => {
	beforeEach(() => {
		getAuditDocument.mockReset();
		listAuditDocuments.mockReset();
		getFinding.mockReset();
		listFindings.mockReset();
		updateFinding.mockReset();
		createCap.mockReset();
		getCap.mockReset();
		listCaps.mockReset();
		updateCap.mockReset();
		logAuditUploadEvent.mockReset().mockResolvedValue(undefined);
	});

	describe("list_audit_documents", () => {
		it("blocks without audit.documents_view", async () => {
			const res = await tool("list_audit_documents").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listAuditDocuments).not.toHaveBeenCalled();
		});

		it("returns one document by id", async () => {
			getAuditDocument.mockResolvedValueOnce({ $id: "d-1", orgId: "org-1" });
			const res = await tool("list_audit_documents").handler(
				ctx([PERMISSIONS.AUDIT.DOCUMENTS_VIEW]),
				{ documentId: "d-1" },
			);
			expect((res.result as { document: unknown }).document).toMatchObject({
				$id: "d-1",
			});
		});

		it("lists documents for the org", async () => {
			listAuditDocuments.mockResolvedValueOnce([{ $id: "d-1" }]);
			const res = await tool("list_audit_documents").handler(
				ctx([PERMISSIONS.AUDIT.DOCUMENTS_VIEW]),
				{},
			);
			expect(listAuditDocuments).toHaveBeenCalledWith(
				"org-1",
				expect.objectContaining({ scope: "active" }),
			);
			expect((res.result as { count: number }).count).toBe(1);
		});
	});

	describe("list_findings", () => {
		it("blocks without audit.documents_view", async () => {
			const res = await tool("list_findings").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listFindings).not.toHaveBeenCalled();
		});

		it("returns one finding by id", async () => {
			getFinding.mockResolvedValueOnce(findingRow);
			const res = await tool("list_findings").handler(
				ctx([PERMISSIONS.AUDIT.DOCUMENTS_VIEW]),
				{ findingId: "f-1" },
			);
			expect((res.result as { finding: unknown }).finding).toMatchObject({
				$id: "f-1",
			});
		});

		it("lists findings with filters", async () => {
			listFindings.mockResolvedValueOnce([findingRow]);
			const res = await tool("list_findings").handler(
				ctx([PERMISSIONS.AUDIT.DOCUMENTS_VIEW]),
				{ documentId: "doc-1", status: "confirmed" },
			);
			expect(listFindings).toHaveBeenCalledWith(
				expect.objectContaining({
					orgId: "org-1",
					documentId: "doc-1",
					status: "confirmed",
				}),
			);
			expect((res.result as { count: number }).count).toBe(1);
		});
	});

	describe("dispute_finding", () => {
		it("blocks without audit.manage_findings", async () => {
			const res = await tool("dispute_finding").handler(ctx([]), {
				findingId: "f-1",
				stance: "rectified",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(updateFinding).not.toHaveBeenCalled();
		});

		it("rejects an invalid stance", async () => {
			getFinding.mockResolvedValueOnce(findingRow);
			const res = await tool("dispute_finding").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_FINDINGS]),
				{ findingId: "f-1", stance: "ignored" },
			);
			expect(errorOf(res)).toMatch(/stance must be/i);
			expect(updateFinding).not.toHaveBeenCalled();
		});

		it("requires a reason to accept risk", async () => {
			getFinding.mockResolvedValueOnce(findingRow);
			const res = await tool("dispute_finding").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_FINDINGS]),
				{ findingId: "f-1", stance: "accepted_risk" },
			);
			expect(errorOf(res)).toMatch(/reason is required/i);
			expect(updateFinding).not.toHaveBeenCalled();
		});

		it("disputes a finding, defaulting the reason, and audits", async () => {
			getFinding.mockResolvedValueOnce(findingRow);
			updateFinding.mockResolvedValueOnce({ status: "disputed" });
			const res = await tool("dispute_finding").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_FINDINGS]),
				{ findingId: "f-1", stance: "disputed" },
			);
			expect(updateFinding).toHaveBeenCalledWith(
				"f-1",
				expect.objectContaining({
					status: "disputed",
					disputeReason: "Disputed",
				}),
			);
			expect(logAuditUploadEvent).toHaveBeenCalled();
			expect((res.result as { status: string }).status).toBe("disputed");
		});

		it("accepts risk with a reason and audits", async () => {
			getFinding.mockResolvedValueOnce(findingRow);
			updateFinding.mockResolvedValueOnce({ status: "accepted_risk" });
			await tool("dispute_finding").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_FINDINGS]),
				{ findingId: "f-1", stance: "accepted_risk", reason: "Low exposure" },
			);
			expect(updateFinding).toHaveBeenCalledWith(
				"f-1",
				expect.objectContaining({
					status: "accepted_risk",
					riskAcceptanceReason: "Low exposure",
					riskAcceptedBy: "admin-1",
				}),
			);
		});
	});

	describe("create_corrective_action", () => {
		it("blocks without audit.manage_caps", async () => {
			const res = await tool("create_corrective_action").handler(ctx([]), {
				findingId: "f-1",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(createCap).not.toHaveBeenCalled();
		});

		it("refuses to duplicate an existing CAP for the finding", async () => {
			getFinding.mockResolvedValueOnce(findingRow);
			listCaps.mockResolvedValueOnce([capRow]);
			const res = await tool("create_corrective_action").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ findingId: "f-1" },
			);
			expect(errorOf(res)).toMatch(/already has a corrective action/i);
			expect(createCap).not.toHaveBeenCalled();
		});

		it("creates a CAP for an org-scoped finding and audits", async () => {
			getFinding.mockResolvedValueOnce(findingRow);
			listCaps.mockResolvedValueOnce([]);
			createCap.mockResolvedValueOnce(capRow);
			const res = await tool("create_corrective_action").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ findingId: "f-1" },
			);
			expect(createCap).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1", findingId: "f-1" }),
			);
			expect(logAuditUploadEvent).toHaveBeenCalled();
			expect((res.result as { created: boolean }).created).toBe(true);
		});
	});

	describe("assign_cap_owner", () => {
		it("blocks without audit.manage_caps", async () => {
			const res = await tool("assign_cap_owner").handler(ctx([]), {
				capId: "cap-1",
				assigneeId: "u-2",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(updateCap).not.toHaveBeenCalled();
		});

		it("denies a CAP from another org", async () => {
			getCap.mockResolvedValueOnce(null);
			const res = await tool("assign_cap_owner").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ capId: "cap-1", assigneeId: "u-2" },
			);
			expect(errorOf(res)).toMatch(/no corrective action found/i);
			expect(updateCap).not.toHaveBeenCalled();
		});

		it("rejects an invalid due date", async () => {
			getCap.mockResolvedValueOnce(capRow);
			const res = await tool("assign_cap_owner").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ capId: "cap-1", assigneeId: "u-2", dueAt: "not-a-date" },
			);
			expect(errorOf(res)).toMatch(/valid due date/i);
			expect(updateCap).not.toHaveBeenCalled();
		});

		it("assigns the owner and due date, and audits", async () => {
			getCap.mockResolvedValueOnce(capRow);
			updateCap.mockResolvedValueOnce({
				...capRow,
				assigneeId: "u-2",
				dueAt: "2027-02-01",
			});
			const res = await tool("assign_cap_owner").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ capId: "cap-1", assigneeId: "u-2", dueAt: "2027-02-01" },
			);
			expect(updateCap).toHaveBeenCalledWith(
				"cap-1",
				expect.objectContaining({ assigneeId: "u-2", dueAt: "2027-02-01" }),
			);
			expect(logAuditUploadEvent).toHaveBeenCalled();
			expect((res.result as { assigned: boolean }).assigned).toBe(true);
		});
	});
});
