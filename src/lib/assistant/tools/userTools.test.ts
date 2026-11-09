import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const createInvitation = vi.fn();
const resendInvitation = vi.fn();
const listPendingInvitations = vi.fn();
const listUsersForManagement = vi.fn();
const updateUserProfile = vi.fn();
const listRoles = vi.fn();
const getRolePermissions = vi.fn();
const getOrganization = vi.fn();
const updateOrganization = vi.fn();
const validateRoleIdsUnionForSod = vi.fn();
const logAuditEvent = vi.fn();
const listRows = vi.fn();
const deleteRow = vi.fn();
const createRow = vi.fn();
const invalidateOrganization = vi.fn();

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
	getRolePermissions: (...args: unknown[]) => getRolePermissions(...args),
}));
vi.mock("@/lib/rbac/organizations", () => ({
	getOrganization: (...args: unknown[]) => getOrganization(...args),
	updateOrganization: (...args: unknown[]) => updateOrganization(...args),
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
		invalidateOrganization: (...args: unknown[]) =>
			invalidateOrganization(...args),
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
		getRolePermissions.mockReset();
		getOrganization.mockReset();
		updateOrganization.mockReset();
		validateRoleIdsUnionForSod.mockReset();
		logAuditEvent.mockReset().mockResolvedValue(undefined);
		listRows.mockReset();
		deleteRow.mockReset();
		createRow.mockReset();
		invalidateOrganization.mockReset().mockResolvedValue(undefined);
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

	it("update_user_profile blocks without users.edit", async () => {
		const res = await tool("update_user_profile").handler(ctx([]), {
			userEmail: "alice@org.test",
			fullName: "Alice New",
		});
		expect((res.result as { error?: string }).error).toMatch(/permission|cannot/i);
		expect(updateUserProfile).not.toHaveBeenCalled();
	});

	it("update_user_profile wraps safe fields and audits", async () => {
		listUsersForManagement.mockResolvedValue([alice]);
		updateUserProfile.mockResolvedValue({
			user: { ...alice, fullName: "Alice New" },
		});
		const res = await tool("update_user_profile").handler(
			ctx([PERMISSIONS.USERS.EDIT]),
			{ userEmail: "alice@org.test", fullName: "Alice New", jobTitle: "Analyst" },
		);
		expect(updateUserProfile).toHaveBeenCalledWith({
			accountId: "acc-alice",
			fullName: "Alice New",
			jobTitle: "Analyst",
		});
		expect(
			(res.result as { updatedFields?: string[] }).updatedFields,
		).toEqual(expect.arrayContaining(["fullName", "jobTitle"]));
		expect(logAuditEvent).toHaveBeenCalled();
	});

	it("list_roles is gated by users.view and summarizes permissions", async () => {
		const denied = await tool("list_roles").handler(ctx([]), {});
		expect((denied.result as { error?: string }).error).toMatch(
			/permission|cannot/i,
		);

		listRoles.mockResolvedValue([
			{
				$id: "role-viewer",
				name: "Viewer",
				description: "Read-only",
				isSystemRole: true,
			},
		]);
		getRolePermissions.mockResolvedValue([PERMISSIONS.USERS.VIEW]);
		const ok = await tool("list_roles").handler(ctx([PERMISSIONS.USERS.VIEW]), {});
		expect(listRoles).toHaveBeenCalledWith("org-1");
		const roles = (ok.result as { roles: Array<{ canDo: string[] }> }).roles;
		expect(roles).toHaveLength(1);
		expect(roles[0]?.canDo[0]).toMatch(/view/i);
	});

	it("update_org_settings blocks without settings.edit and only patches safe fields", async () => {
		const denied = await tool("update_org_settings").handler(ctx([]), {
			timezone: "America/Chicago",
		});
		expect((denied.result as { error?: string }).error).toMatch(
			/permission|cannot/i,
		);

		getOrganization.mockResolvedValue({
			$id: "org-1",
			name: "Acme",
			settings: { maxUsers: 10, maxDepartments: 3, features: [] },
		});
		updateOrganization.mockResolvedValue({
			$id: "org-1",
			name: "Acme",
			settings: {
				maxUsers: 10,
				maxDepartments: 3,
				features: [],
				timezone: "America/Chicago",
			},
		});
		const ok = await tool("update_org_settings").handler(
			ctx([PERMISSIONS.SETTINGS.EDIT]),
			{ timezone: "America/Chicago" },
		);
		expect(updateOrganization).toHaveBeenCalledWith(
			"org-1",
			expect.objectContaining({
				settings: expect.objectContaining({
					timezone: "America/Chicago",
					maxUsers: 10,
					maxDepartments: 3,
				}),
			}),
		);
		expect(
			(ok.result as { updatedFields?: string[] }).updatedFields,
		).toEqual(["timezone"]);
		expect(logAuditEvent).toHaveBeenCalled();
	});
});
