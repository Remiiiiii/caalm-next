import { beforeEach, describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";

const createInvitation = vi.fn();
const resendInvitation = vi.fn();
const listPendingInvitations = vi.fn();
const listUsersForManagement = vi.fn();
const getUninvitedUsers = vi.fn();
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
	getUninvitedUsers: (...args: unknown[]) => getUninvitedUsers(...args),
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

const { USER_TOOLS, normalizeUserToolPendingArgs } = await import("./userTools");

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
		getUninvitedUsers.mockReset();
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
		getUninvitedUsers.mockResolvedValue([
			{ $id: "dir-1", email: "new@org.test", fullName: "New Person" },
		]);
	});

	it("invite_user blocks without users.invite", async () => {
		const res = await tool("invite_user").handler(ctx([]), {
			email: "new@org.test",
			name: "New",
			role: "Viewer",
			department: "Administration",
		});
		expect((res.result as { error?: string }).error).toMatch(/permission|cannot/i);
		expect(createInvitation).not.toHaveBeenCalled();
	});

	it("invite_user rejects emails not in the connected directory", async () => {
		getUninvitedUsers.mockResolvedValue([]);
		const res = await tool("invite_user").handler(
			ctx([PERMISSIONS.USERS.INVITE]),
			{
				email: "stranger@org.test",
				name: "Stranger",
				role: "Viewer",
				department: "Administration",
			},
		);
		expect((res.result as { error?: string }).error).toMatch(/directory/i);
		expect(createInvitation).not.toHaveBeenCalled();
	});

	it("invite_user wraps createInvitation and audits", async () => {
		createInvitation.mockResolvedValue({
			$id: "inv-1",
			token: "tok-inv-1",
			expiresAt: "2026-12-01T00:00:00.000Z",
			status: "pending-review",
			$createdAt: "2026-11-10T00:00:00.000Z",
		});
		const res = await tool("invite_user").handler(
			ctx([PERMISSIONS.USERS.INVITE]),
			{
				email: "new@org.test",
				name: "New Person",
				role: "Viewer",
				department: "Administration",
			},
		);
		expect(createInvitation).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "new@org.test",
				orgId: "org-1",
				department: "Administration",
				invitedBy: "admin-1",
			}),
		);
		const result = res.result as {
			invited?: { email: string };
			dashboardInvitations?: Array<{ token?: string; email?: string }>;
		};
		expect(result.invited?.email).toBe("new@org.test");
		expect(result.dashboardInvitations?.[0]?.token).toBe("tok-inv-1");
		expect(result.dashboardInvitations?.[0]?.email).toBe("new@org.test");
		expect(logAuditEvent).toHaveBeenCalled();
	});

	it("invite_users sends each directory person", async () => {
		getUninvitedUsers.mockResolvedValue([
			{ $id: "n1", email: "nora@org.test", fullName: "Nora Castillo" },
			{ $id: "r1", email: "robin@org.test", fullName: "Robin Shaw" },
		]);
		createInvitation
			.mockResolvedValueOnce({
				$id: "inv-n",
				token: "tok-n",
				expiresAt: "2026-12-01T00:00:00.000Z",
				status: "pending-review",
				$createdAt: "2026-11-10T00:00:00.000Z",
			})
			.mockResolvedValueOnce({
				$id: "inv-r",
				token: "tok-r",
				expiresAt: "2026-12-01T00:00:00.000Z",
				status: "pending-review",
				$createdAt: "2026-11-10T00:00:00.000Z",
			});
		const res = await tool("invite_users").handler(
			ctx([PERMISSIONS.USERS.INVITE]),
			{
				invitees_json: JSON.stringify([
					{ email: "nora@org.test", name: "Nora Castillo" },
					{ email: "robin@org.test", name: "Robin Shaw" },
				]),
				role: "Viewer",
				department: "Executive",
			},
		);
		expect(createInvitation).toHaveBeenCalledTimes(2);
		const result = res.result as {
			invited?: Array<Record<string, unknown>>;
			dashboardInvitations?: Array<Record<string, unknown>>;
			message?: string;
			pendingInvitationsHref?: string;
			expiresInDays?: number;
		};
		expect(result.invited).toHaveLength(2);
		expect(result.dashboardInvitations).toHaveLength(2);
		expect(result.dashboardInvitations?.[0]?.token).toBe("tok-n");
		expect(result.message).toBeUndefined();
		expect(result.pendingInvitationsHref).toBeUndefined();
		expect(result.expiresInDays).toBeUndefined();
		expect(result.invited?.[0]).not.toHaveProperty("invitationId");
		expect(result.invited?.[0]).not.toHaveProperty("expiresInDays");
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

	it("list_users filters by department", async () => {
		listUsersForManagement.mockResolvedValue([
			{ ...alice, department: "IT" },
			{
				...alice,
				$id: "u-2",
				email: "bob@org.test",
				fullName: "Bob",
				department: "Finance",
			},
		]);
		const ok = await tool("list_users").handler(ctx([PERMISSIONS.USERS.VIEW]), {
			department: "IT",
		});
		const users = (ok.result as { users: Array<{ name: string }> }).users;
		expect(users).toHaveLength(1);
		expect(users[0]?.name).toBe("Alice Example");
		expect((ok.result as { department?: string }).department).toBe("IT");
	});

	it("list_departments returns department names, not people", async () => {
		const denied = await tool("list_departments").handler(ctx([]), {});
		expect((denied.result as { error?: string }).error).toMatch(
			/permission|cannot/i,
		);

		const ok = await tool("list_departments").handler(
			ctx([PERMISSIONS.AI.CHAT]),
			{},
		);
		const departments = (ok.result as { departments: Array<{ name: string }> })
			.departments;
		expect(departments.length).toBeGreaterThan(0);
		expect(departments.some((d) => d.name === "IT")).toBe(true);
		expect(departments.every((d) => typeof d.name === "string")).toBe(true);
		expect((ok.result as { users?: unknown }).users).toBeUndefined();
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

	it("normalizeUserToolPendingArgs rewrites a name lookup to the real email", async () => {
		listUsersForManagement.mockResolvedValue([alice]);
		const normalized = await normalizeUserToolPendingArgs(
			"org-1",
			"update_user_profile",
			{ userEmail: "Alice Example", fullName: "Alice New" },
		);
		expect(normalized.error).toBeUndefined();
		expect(normalized.subjectLabel).toBe("Alice Example");
		expect(normalized.args.userEmail).toBe("alice@org.test");
		expect(normalized.args.userId).toBe("u-alice");
		expect(normalized.args.userDisplayName).toBe("Alice Example");
		expect(normalized.args.fullName).toBe("Alice New");
	});

	it("normalizeUserToolPendingArgs recovers when the model invents a name-based email", async () => {
		listUsersForManagement.mockResolvedValue([
			{
				...alice,
				fullName: "Blair Montgomery",
				email: "csuite1.chart@example.com",
				$id: "u-blair",
			},
		]);
		const normalized = await normalizeUserToolPendingArgs(
			"org-1",
			"update_user_profile",
			{
				userEmail: "blair.montgomery@example.com",
				fullName: "Blair Rodriguez",
			},
		);
		expect(normalized.error).toBeUndefined();
		expect(normalized.args.userEmail).toBe("csuite1.chart@example.com");
		expect(normalized.subjectLabel).toBe("Blair Montgomery");
	});

	it("normalizeUserToolPendingArgs picks the best name match when several soft-match", async () => {
		listUsersForManagement.mockResolvedValue([
			alice,
			{
				...alice,
				$id: "u-alice-other",
				fullName: "Alice Other",
				email: "alice.other@org.test",
			},
		]);
		const byFullName = await normalizeUserToolPendingArgs(
			"org-1",
			"update_user_profile",
			{ userEmail: "Alice Example" },
		);
		expect(byFullName.error).toBeUndefined();
		expect(byFullName.args.userEmail).toBe("alice@org.test");

		listUsersForManagement.mockResolvedValue([
			{
				...alice,
				$id: "u-blair",
				fullName: "Blair Montgomery",
				email: "csuite1.chart@example.com",
			},
			{
				...alice,
				$id: "u-blair-jr",
				fullName: "Blair Montgomery Jr",
				email: "blair.jr@org.test",
			},
		]);
		const blair = await normalizeUserToolPendingArgs(
			"org-1",
			"update_user_profile",
			{ userEmail: "blair.montgomery@example.com" },
		);
		expect(blair.error).toBeUndefined();
		expect(blair.args.userEmail).toBe("csuite1.chart@example.com");
		expect(blair.subjectLabel).toBe("Blair Montgomery");
	});

	it("normalizeUserToolPendingArgs returns an error when top matches tie", async () => {
		listUsersForManagement.mockResolvedValue([
			{ ...alice, $id: "u-alice-1", fullName: "Alice Example", email: "a1@org.test" },
			{ ...alice, $id: "u-alice-2", fullName: "Alice Example", email: "a2@org.test" },
		]);
		const normalized = await normalizeUserToolPendingArgs(
			"org-1",
			"update_user_profile",
			{ userEmail: "Alice Example" },
		);
		expect(normalized.error).toMatch(/Several people match/i);
		expect(normalized.error).toMatch(/a1@org\.test/);
		expect(normalized.error).toMatch(/a2@org\.test/);
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
