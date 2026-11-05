import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const getCap = vi.fn();
const listCaps = vi.fn();
const updateCap = vi.fn();

vi.mock("@/lib/audit-upload/store", () => ({
	getCap: (...args: unknown[]) => getCap(...args),
	listCaps: (...args: unknown[]) => listCaps(...args),
	updateCap: (...args: unknown[]) => updateCap(...args),
}));
vi.mock("@/lib/audit-upload/audit-log", () => ({
	logAuditUploadEvent: vi.fn(),
}));
vi.mock("@/lib/audit-upload/confirm-finding", () => ({
	confirmAuditFinding: vi.fn(),
}));
vi.mock("@/lib/services/audit-logger", () => ({ getAuditLogs: vi.fn() }));

const { AUDIT_TOOLS } = await import("./auditTools");

const prepareClose = AUDIT_TOOLS.find(
	(t) => t.name === "prepare_close_corrective_action",
);
if (!prepareClose) throw new Error("tool missing");

// Minimal context; only permissions + orgId are read by this handler.
function ctx(perms: string[]) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: "u1" },
	} as unknown as Parameters<typeof prepareClose.handler>[0];
}

const closableCap = {
	$id: "cap-real",
	findingId: "find-1",
	documentId: "doc-1",
	orgId: "org-1",
	status: "in_progress",
	canClose: true,
	closeBlocker: null,
	title: "CAP",
};

const args = {
	capId: "cap-stale",
	findingId: "find-1",
	documentId: "doc-1",
	verificationNote: "Uploaded files and corrected the misclassification.",
};

describe("prepare_close_corrective_action", () => {
	beforeEach(() => {
		getCap.mockReset();
		listCaps.mockReset();
	});

	it("blocks without manage_caps permission", async () => {
		const res = await prepareClose.handler(ctx([]), args);
		expect((res.result as { error?: string }).error).toMatch(/permission|cannot/i);
	});

	it("resolves the cap by finding when the given capId is stale", async () => {
		getCap.mockResolvedValue(null); // stale id returns nothing
		listCaps.mockResolvedValue([closableCap]);
		const res = await prepareClose.handler(
			ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
			args,
		);
		expect(res.clientAction?.type).toBe("open_close_cap");
		expect(res.clientAction?.capId).toBe("cap-real");
	});

	it("fails cleanly when no cap exists for the finding", async () => {
		getCap.mockResolvedValue(null);
		listCaps.mockResolvedValue([]);
		const res = await prepareClose.handler(
			ctx([PERMISSIONS.AUDIT.MANAGE_CAPS]),
			args,
		);
		expect(res.clientAction).toBeUndefined();
		expect((res.result as { error?: string }).error).toMatch(/does not have/i);
	});
});
