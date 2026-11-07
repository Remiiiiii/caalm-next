import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const createInvitation = vi.fn();
const resendInvitation = vi.fn();
const listPendingInvitations = vi.fn();
const listUsersForManagement = vi.fn();
const updateUserProfile = vi.fn();
const listRoles = vi.fn();
const validateRoleIdsUnionForSod = vi.fn();
const logAuditEvent = vi.fn();
const listRows = vi.fn();
const deleteRow = vi.fn();
const createRow = vi.fn();

vi.mock("@/lib/actions/user.actions", () => ({
	createInvitation: (...args: unknown[]) => createInvitation(...args),
	resendInvitation: (...args: unknown[]) => resendInvitation(...args),
	listPendingInvitations: (...args: unknown[]) =>
		listPendingInvitations(...args),
	listUsersForManagement: (...args: unknown[]) =>
		listUsersForManagement(...args),
	updateUserProfile: (...args: unknown[]) => updateUserProfile(...args),
}));
vi.mock("@/lib/rbac/roles", () => ({
	listRoles: (...args: unknown[]) => listRoles(...args),
}));
vi.mock("@/lib/rbac/separation-of-duties", () => ({
	validateRoleIdsUnionForSod: (...args: unknown[]) =>
		validateRoleIdsUnionForSod(...args),
}));
vi.mock("@/lib/services/audit-logger", () => ({
	logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}));
vi.mock("@/lib/services/cache-manager", () => ({
	default: {
		invalidateRBAC: vi.fn(),
		invalidateUsers: vi.fn(),
	},
}));
vi.mock("@/lib/appwrite", () => ({
	createAdminClient: async () => ({
		tablesDB: { listRows, deleteRow, createRow },
	}),
}));

const { USER_TOOLS } = await import("./userTools");

function tool(name: string) {
	const found = USER_TOOLS.find((item) => item.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

function ctx(perms: string[], extra?: { userId?: string }) {
	return {
		orgId: "org-1",
		permissions: perms,
		user: { $id: extra?.userId ?? "admin-1", email: "admin@org.test", name: "Admin" },
	} as unknown as Parameters<(typeof USER_TOOLS)[number]["handler"]>[0];
}

const alice = {
	$id: "u-alice",
	fullName: "Alice Example",
	email: "alice@org.test",
	accountId: "acc-alice",
	roleName: "Viewer",
	status: "active",
	department: "Administration",
};

describe("USER_TOOLS", () => {
	beforeEach(() => {
		createInvitation.mockReset();
		resendInvitation.mockReset();
		listPendingInvitations.mockReset();
		listUsersForManagement.mockReset();
		updateUserProfile.mockReset();
		listRoles.mockReset();
		validateRoleIdsUnionForSod.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
		listRows.mockReset();
		deleteRow.mockReset();
		createRow.mockReset();
	});

	it("invite_user blocks without users.invite", async () => {
		const res = await tool("invite_user").handler(ctx([]), {
			email: "new@org.test",
			name: "New",
			role: "Viewer",
		});
		expect((res.result as { error?: string }).error).toMatch(/permission|cannot/i);
		expect(createInvitation).not.toHaveBeenCalled();
	});

	it("invite_user wraps createInvitation and audits", async () => {
		createInvitation.mockResolvedValue({ $id: "inv-1" });
		const res = await tool("invite_user").handler(
			ctx([PERMISSIONS.USERS.INVITE]),
			{ email: "new@org.test", name: "New Person", role: "Viewer" },
		);
		expect(createInvitation).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "new@org.test",
				orgId: "org-1",
				invitedBy: "admin-1",
			}),
		);
		expect((res.result as { invited?: { email: string } }).invited?.email).toBe(
			"new@org.test",
		);
		expect(logAuditEvent).toHaveBeenCalled();
	});

	it("resend_invite finds a pending invite in the org", async () => {
		listPendingInvitations.mockResolvedValue([
			{ email: "new@org.test", token: "tok-1" },
		]);
		resendInvitation.mockResolvedValue({ success: true, email: "new@org.test" });
		const res = await tool("resend_invite").handler(
			ctx([PERMISSIONS.USERS.INVITE]),
			{ email: "new@org.test" },
		);
		expect(resendInvitation).toHaveBeenCalledWith({ token: "tok-1" });
		expect((res.result as { resent?: boolean }).resent).toBe(true);
	});

	it("list_users is org-scoped and gated by users.view", async () => {
		const denied = await tool("list_users").handler(ctx([]), { query: "alice" });
		expect((denied.result as { error?: string }).error).toMatch(/permission|cannot/i);

		listUsersForManagement.mockResolvedValue([alice]);
		const ok = await tool("list_users").handler(ctx([PERMISSIONS.USERS.VIEW]), {
			query: "alice",
		});
		expect(listUsersForManagement).toHaveBeenCalledWith("org-1");
		expect((ok.result as { users: unknown[] }).users).toHaveLength(1);
	});

	it("assign_user_roles blocks without users.assign_roles", async () => {
		const res = await tool("assign_user_roles").handler(ctx([]), {
			userEmail: "alice@org.test",
			roleNames: ["Viewer"],
		});
		expect((res.result as { error?: string }).error).toMatch(/permission|cannot/i);
	});

	it("assign_user_roles replaces roles and audits", async () => {
		listUsersForManagement.mockResolvedValue([alice]);
		listRoles.mockResolvedValue([{ $id: "role-viewer", name: "Viewer" }]);
		validateRoleIdsUnionForSod.mockResolvedValue({ ok: true });
		listRows.mockResolvedValue({
			rows: [{ $id: "ur-old", roleId: "role-old" }],
		});
		deleteRow.mockResolvedValue({});
		createRow.mockResolvedValue({});

		const res = await tool("assign_user_roles").handler(
			ctx([PERMISSIONS.USERS.ASSIGN_ROLES]),
			{ userEmail: "alice@org.test", roleNames: ["Viewer"], mode: "replace" },
		);
		expect(deleteRow).toHaveBeenCalled();
		expect(createRow).toHaveBeenCalled();
		expect(logAuditEvent).toHaveBeenCalled();
		expect((res.result as { roleIds?: string[] }).roleIds).toEqual([
			"role-viewer",
		]);
	});

	it("deactivate_user blocks without users.deactivate and refuses self", async () => {
		const denied = await tool("deactivate_user").handler(ctx([]), {
			userEmail: "alice@org.test",
		});
		expect((denied.result as { error?: string }).error).toMatch(
			/permission|cannot/i,
		);

		listUsersForManagement.mockResolvedValue([
			{ ...alice, $id: "admin-1", email: "admin@org.test" },
		]);
		const self = await tool("deactivate_user").handler(
			ctx([PERMISSIONS.USERS.DEACTIVATE], { userId: "admin-1" }),
			{ userEmail: "admin@org.test" },
		);
		expect((self.result as { error?: string }).error).toMatch(/own account/i);
		expect(updateUserProfile).not.toHaveBeenCalled();
	});

	it("deactivate_user wraps updateUserProfile", async () => {
		listUsersForManagement.mockResolvedValue([alice]);
		updateUserProfile.mockResolvedValue({
			user: { ...alice, status: "inactive" },
			previousStatus: "active",
		});
		const res = await tool("deactivate_user").handler(
			ctx([PERMISSIONS.USERS.DEACTIVATE]),
			{ userEmail: "alice@org.test" },
		);
		expect(updateUserProfile).toHaveBeenCalledWith({
			accountId: "acc-alice",
			status: "inactive",
		});
		expect((res.result as { user?: { status: string } }).user?.status).toBe(
			"inactive",
		);
		expect(logAuditEvent).toHaveBeenCalled();
	});
});
