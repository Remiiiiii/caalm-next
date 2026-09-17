import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLogAuditEvent = vi.fn();
const mockRequirePermission = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockUpdateUserProfile = vi.fn();
const mockInvalidateAudits = vi.fn();

vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

vi.mock("@/lib/rbac/middleware", () => ({
	requirePermission: () => mockRequirePermission(),
	getOrgIdFromRequest: () => "org-1",
}));

vi.mock("@/lib/auth/step-up", () => ({
	requireStepUpForSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/actions/user.actions", () => ({
	getCurrentUser: () => mockGetCurrentUser(),
	updateUserProfile: (...args: unknown[]) => mockUpdateUserProfile(...args),
}));

vi.mock("@/lib/services/cache-manager", () => ({
	default: {
		invalidateAudits: () => mockInvalidateAudits(),
	},
}));

vi.mock("@/lib/org/org-unit-validation", () => ({
	normalizeOrgPlacement: vi.fn(),
	OrgUnitValidationError: class OrgUnitValidationError extends Error {},
}));

function statusRequest(body: Record<string, unknown>): NextRequest {
	return new NextRequest("http://localhost:3000/api/user/update", {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			"x-forwarded-for": "203.0.113.10",
			"user-agent": "vitest",
		},
		body: JSON.stringify(body),
	});
}

describe("account status audit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequirePermission.mockResolvedValue(null);
		mockGetCurrentUser.mockResolvedValue({
			$id: "admin-1",
			fullName: "Ada Admin",
			email: "ada@example.com",
		});
		mockUpdateUserProfile.mockResolvedValue({
			user: {
				$id: "user-2",
				fullName: "Jimmy Hendricks",
				email: "jimmy@example.com",
				orgId: "org-1",
				status: "suspended",
			},
			previousStatus: "active",
		});
		mockLogAuditEvent.mockResolvedValue(undefined);
		mockInvalidateAudits.mockResolvedValue(undefined);
	});

	it("writes an audit event when an admin deactivates an account", async () => {
		const { logAccountStatusChange } = await import(
			"@/lib/users/account-status-audit"
		);
		await logAccountStatusChange({
			actor: {
				$id: "admin-1",
				fullName: "Ada Admin",
				email: "ada@example.com",
			},
			target: {
				$id: "user-2",
				fullName: "Jimmy Hendricks",
				email: "jimmy@example.com",
				orgId: "org-1",
			},
			previousStatus: "active",
			nextStatus: "suspended",
			orgId: "org-1",
			request: statusRequest({ accountId: "acct-2", status: "suspended" }),
		});

		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				event_title: "Account deactivated",
				action: "update",
				module: "governance",
				target_type: "user",
				target_id: "user-2",
				target_label: "Jimmy Hendricks",
				summary: "Ada Admin deactivated Jimmy Hendricks",
				status: "success",
				ip_address: "203.0.113.10",
				user_agent: "vitest",
				changes: [{ field: "status", before: "active", after: "suspended" }],
			}),
		);
	});

	it("writes an audit event when an admin reactivates an account", async () => {
		const { logAccountStatusChange } = await import(
			"@/lib/users/account-status-audit"
		);
		await logAccountStatusChange({
			actor: {
				$id: "admin-1",
				fullName: "Ada Admin",
				email: "ada@example.com",
			},
			target: {
				$id: "user-2",
				fullName: "Jimmy Hendricks",
				email: "jimmy@example.com",
			},
			previousStatus: "suspended",
			nextStatus: "active",
			request: statusRequest({ accountId: "acct-2", status: "active" }),
		});

		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				event_title: "Account reactivated",
				summary: "Ada Admin reactivated Jimmy Hendricks",
				changes: [{ field: "status", before: "suspended", after: "active" }],
			}),
		);
	});

	it("skips the audit when status did not change", async () => {
		const { logAccountStatusChange } = await import(
			"@/lib/users/account-status-audit"
		);
		await logAccountStatusChange({
			actor: { $id: "admin-1", fullName: "Ada Admin" },
			target: { $id: "user-2", fullName: "Jimmy Hendricks" },
			previousStatus: "active",
			nextStatus: "active",
			request: statusRequest({ accountId: "acct-2", status: "active" }),
		});

		expect(mockLogAuditEvent).not.toHaveBeenCalled();
	});

	it("PATCH /api/user/update logs deactivate to the audit trail", async () => {
		const { PATCH } = await import("@/app/api/user/update/route");
		const response = await PATCH(
			statusRequest({ accountId: "acct-2", status: "suspended" }),
		);

		expect(response.status).toBe(200);
		expect(mockLogAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				event_title: "Account deactivated",
				target_id: "user-2",
			}),
		);
		expect(mockInvalidateAudits).toHaveBeenCalled();
	});

	it("PATCH /api/user/update does not write a status audit for name-only edits", async () => {
		const { PATCH } = await import("@/app/api/user/update/route");
		await PATCH(
			statusRequest({ accountId: "acct-2", fullName: "Jimmy Hendricks" }),
		);

		expect(mockLogAuditEvent).not.toHaveBeenCalled();
	});
});
