import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { getPolicyEntryForPath } from "@/lib/rbac/dashboard-access-policy";
import { validatePermissionsForSod } from "@/lib/rbac/separation-of-duties";

describe("dashboard-access-policy", () => {
	it("matches longest dashboard prefix for nested admin routes", () => {
		const entry = getPolicyEntryForPath("/dashboard/admin/roles/new");
		expect(entry?.pathPrefix).toBe("/dashboard/admin/roles");
	});

	it("resolves superadmin shell", () => {
		const entry = getPolicyEntryForPath("/dashboard/superadmin");
		expect(entry?.allowedRoleIds).toContain("role_super_admin");
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
