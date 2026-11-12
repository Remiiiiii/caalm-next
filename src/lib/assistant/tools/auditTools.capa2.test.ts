import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getCap = vi.fn();
const listCaps = vi.fn();
const updateCap = vi.fn();
const logAuditUploadEvent = vi.fn();
const runReadinessAuditForOrg = vi.fn();
const createFile = vi.fn();

vi.mock("@/lib/audit-upload/store", () => ({
	getAuditDocument: vi.fn(),
	listAuditDocuments: vi.fn(),
	getFinding: vi.fn(),
	listFindings: vi.fn(),
	updateFinding: vi.fn(),
	createCap: vi.fn(),
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
vi.mock("@/lib/appwrite", () => ({
	createAdminClient: async () => ({
		storage: { createFile: (...args: unknown[]) => createFile(...args) },
	}),
}));
vi.mock("@/lib/appwrite/config", () => ({
	appwriteConfig: { auditDocumentsBucketId: "audit-docs-bucket" },
}));
vi.mock("node-appwrite", () => ({ ID: { unique: () => "new-file-id" } }));
vi.mock("node-appwrite/file", () => ({
	InputFile: { fromBuffer: (buf: Buffer, name: string) => ({ buf, name }) },
}));
vi.mock("@/lib/audits/readiness/run-audit", () => ({
	runReadinessAuditForOrg: (...args: unknown[]) =>
		runReadinessAuditForOrg(...args),
}));

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

const capRow = {
	$id: "cap-1",
	orgId: "org-1",
	findingId: "f-1",
	documentId: "doc-1",
	title: "Correct: Access review gap",
	status: "open",
	dueAt: "2020-01-01",
	evidenceAttachments: [],
};

describe("AUDIT_TOOLS CAPA depth (6.6-6.10)", () => {
	beforeEach(() => {
		getCap.mockReset();
		listCaps.mockReset();
		updateCap.mockReset();
		logAuditUploadEvent.mockReset().mockResolvedValue(undefined);
		runReadinessAuditForOrg.mockReset();
		createFile.mockReset();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => ({
				ok: true,
				status: 200,
				headers: new Map([
					["content-length", "100"],
					["content-type", "image/png"],
				]) as unknown as Headers,
				arrayBuffer: async () => new ArrayBuffer(100),
			})),
		);
	});

	describe("upload_cap_evidence", () => {
		it("blocks without audit.manage_caps", async () => {
			const res = await tool("upload_cap_evidence").handler(ctx([]), {
				capId: "cap-1",
				fileUrl: "https://example.com/a.png",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(createFile).not.toHaveBeenCalled();
		});

		it("rejects a non-https url", async () => {
			getCap.mockResolvedValueOnce(capRow);
			const res = await tool("upload_cap_evidence").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ capId: "cap-1", fileUrl: "http://example.com/a.png" },
			);
			expect(errorOf(res)).toMatch(/https/i);
		});

		it("denies a CAP from another org", async () => {
			getCap.mockResolvedValueOnce(null);
			const res = await tool("upload_cap_evidence").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ capId: "cap-1", fileUrl: "https://example.com/a.png" },
			);
			expect(errorOf(res)).toMatch(/no corrective action found/i);
		});

		it("attaches evidence and audits", async () => {
			getCap.mockResolvedValueOnce(capRow);
			createFile.mockResolvedValueOnce({ $id: "file-1" });
			updateCap.mockResolvedValueOnce({
				...capRow,
				evidenceAttachments: [{ fileId: "file-1", fileName: "a.png" }],
			});
			const res = await tool("upload_cap_evidence").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ capId: "cap-1", fileUrl: "https://example.com/a.png" },
			);
			expect(updateCap).toHaveBeenCalledWith(
				"cap-1",
				expect.objectContaining({
					evidenceAttachments: [expect.objectContaining({ fileId: "file-1" })],
				}),
			);
			expect(logAuditUploadEvent).toHaveBeenCalled();
			expect(
				(res.result as { attachment: { fileId: string } }).attachment.fileId,
			).toBe("file-1");
		});
	});

	describe("list_open_caps", () => {
		it("blocks without audit.documents_view", async () => {
			const res = await tool("list_open_caps").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(listCaps).not.toHaveBeenCalled();
		});

		it("filters to open/overdue statuses and flags overdue", async () => {
			listCaps.mockResolvedValueOnce([
				capRow,
				{ ...capRow, $id: "cap-2", status: "closed" },
			]);
			const res = await tool("list_open_caps").handler(
				ctx([PERMISSIONS.AUDIT.DOCUMENTS_VIEW]),
				{},
			);
			const { caps, count } = res.result as {
				caps: Array<{ $id: string; overdue: boolean }>;
				count: number;
			};
			expect(count).toBe(1);
			expect(caps[0].$id).toBe("cap-1");
			expect(caps[0].overdue).toBe(true);
		});
	});

	describe("draft_verification_note", () => {
		it("blocks without audit.manage_caps", async () => {
			const res = await tool("draft_verification_note").handler(ctx([]), {
				capId: "cap-1",
				verificationNote: "Fixed",
			});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(updateCap).not.toHaveBeenCalled();
		});

		it("requires a verification note", async () => {
			getCap.mockResolvedValueOnce(capRow);
			const res = await tool("draft_verification_note").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ capId: "cap-1" },
			);
			expect(errorOf(res)).toMatch(/verification note/i);
		});

		it("stages the note without closing anything", async () => {
			getCap.mockResolvedValueOnce(capRow);
			const res = await tool("draft_verification_note").handler(
				ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
				{ capId: "cap-1", verificationNote: "All tasks complete" },
			);
			expect(updateCap).not.toHaveBeenCalled();
			expect((res.result as { staged: boolean }).staged).toBe(true);
			expect(
				(res.result as { verificationNote: string }).verificationNote,
			).toBe("All tasks complete");
		});
	});

	describe("export_audit_report", () => {
		it("blocks without audit.documents_view", async () => {
			const res = await tool("export_audit_report").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
		});

		it("reports unavailable without pretending to export anything", async () => {
			const res = await tool("export_audit_report").handler(
				ctx([PERMISSIONS.AUDIT.DOCUMENTS_VIEW]),
				{},
			);
			expect((res.result as { available: boolean }).available).toBe(false);
			expect((res.result as { message: string }).message).toMatch(
				/isn't available/i,
			);
		});
	});

	describe("run_readiness_check", () => {
		it("blocks without audit.documents_view", async () => {
			const res = await tool("run_readiness_check").handler(ctx([]), {});
			expect(errorOf(res)).toMatch(/permission|cannot/i);
			expect(runReadinessAuditForOrg).not.toHaveBeenCalled();
		});

		it("reports skipped when no snapshot is produced", async () => {
			runReadinessAuditForOrg.mockResolvedValueOnce({
				snapshot: null,
				skipped: "already_ran_today",
			});
			const res = await tool("run_readiness_check").handler(
				ctx([PERMISSIONS.AUDIT.DOCUMENTS_VIEW]),
				{},
			);
			expect((res.result as { ran: boolean }).ran).toBe(false);
			expect(logAuditUploadEvent).not.toHaveBeenCalled();
		});

		it("runs the check with the given cadence and audits", async () => {
			runReadinessAuditForOrg.mockResolvedValueOnce({
				snapshot: {
					$id: "snap-1",
					score: 82,
					ragStatus: "green",
					cadence: "weekly",
					createdAt: "2026-01-01T00:00:00.000Z",
					aiSummary: "Looking good",
				},
			});
			const res = await tool("run_readiness_check").handler(
				ctx([PERMISSIONS.AUDIT.DOCUMENTS_VIEW]),
				{ cadence: "weekly" },
			);
			expect(runReadinessAuditForOrg).toHaveBeenCalledWith(
				expect.objectContaining({ orgId: "org-1", cadence: "weekly" }),
			);
			expect(logAuditUploadEvent).toHaveBeenCalled();
			expect((res.result as { ran: boolean; score: number }).score).toBe(82);
		});
	});
});
