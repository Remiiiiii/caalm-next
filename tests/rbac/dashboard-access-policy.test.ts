import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getPolicyEntryForPath,
	isRoleDashboardHomePath,
} from "@/lib/rbac/dashboard-access-policy";
import {
	appendSessionChangedNotice,
	getCachedUserId,
	parseCachedAuthUser,
} from "@/lib/auth/session-sync";
import { validatePermissionsForSod } from "@/lib/rbac/separation-of-duties";

describe("session-sync", () => {
	it("appends session changed notice query param", () => {
		expect(appendSessionChangedNotice("/dashboard/superadmin")).toBe(
			"/dashboard/superadmin?notice=session_changed",
		);
	});

	it("parses cached user id from localStorage payload", () => {
		const raw = JSON.stringify({
			user: { $id: "user_1", name: "Victor" },
			timestamp: Date.now(),
		});
		expect(getCachedUserId(raw)).toBe("user_1");
		expect(parseCachedAuthUser(raw)?.user?.name).toBe("Victor");
	});
});

describe("dashboard-access-policy", () => {
	it("identifies role dashboard home paths", () => {
		expect(isRoleDashboardHomePath("/dashboard/departmentmanager")).toBe(true);
		expect(isRoleDashboardHomePath("/dashboard/it/monitoring")).toBe(false);
	});

	it("matches longest dashboard prefix for nested admin routes", () => {
		const entry = getPolicyEntryForPath("/dashboard/admin/roles/new");
		expect(entry?.pathPrefix).toBe("/dashboard/admin/roles");
	});

	it("resolves superadmin shell", () => {
		const entry = getPolicyEntryForPath("/dashboard/superadmin");
		expect(entry?.allowedRoleIds).toContain("role_super_admin");
	});

	it("opens IT portal only with monitoring permission and IT department", () => {
		const entry = getPolicyEntryForPath("/dashboard/it");
		expect(entry?.anyOf).toContain(PERMISSIONS.IT.VIEW_MONITORING);
		expect(entry?.requireITDepartment).toBe(true);
		expect(entry?.allowedRoleIds).toBeUndefined();
	});

	it("returns null for unlisted dashboard paths", () => {
		expect(getPolicyEntryForPath("/dashboard/manager")).toBeNull();
	});
});

describe("separation-of-duties", () => {
	it("does not exempt assign_roles alone from SoD", () => {
		const r = validatePermissionsForSod([
			PERMISSIONS.USERS.ASSIGN_ROLES,
			PERMISSIONS.CONTRACTS.CREATE,
			PERMISSIONS.CONTRACTS.APPROVE,
		]);
		expect(r.ok).toBe(false);
	});

	it("rejects create and approve on the same custom role", () => {
		const r = validatePermissionsForSod([
			PERMISSIONS.CONTRACTS.CREATE,
			PERMISSIONS.CONTRACTS.APPROVE,
		]);
		expect(r.ok).toBe(false);
	});

	it("allows toxic pairs on system roles", () => {
		const r = validatePermissionsForSod(
			[PERMISSIONS.CONTRACTS.CREATE, PERMISSIONS.CONTRACTS.APPROVE],
			{ isSystemRole: true },
		);
		expect(r.ok).toBe(true);
	});
});
