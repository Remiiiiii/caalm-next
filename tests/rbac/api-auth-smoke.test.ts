/**
 * Catalog regression smoke: PLATFORM / APPROVALS keys and role templates.
 */

import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import { ROLE_TEMPLATES } from "@/constants/role-templates";

describe("RBAC catalog smoke", () => {
	it("exposes PLATFORM permission keys", () => {
		expect(PERMISSIONS.PLATFORM).toBeDefined();
		expect(PERMISSIONS.PLATFORM.SYSTEM_SETTINGS).toBe(
			"platform.system_settings",
		);
		expect(PERMISSIONS.PLATFORM.DIAGNOSE).toBe("platform.diagnose");
		expect(PERMISSIONS.PLATFORM.MANAGE_SCHEMA).toBe("platform.manage_schema");
		expect(PERMISSIONS.PLATFORM.FORCE_DELETE).toBe("platform.force_delete");
		expect(PERMISSIONS.PLATFORM.VIEW_ALL_ORGS).toBe("platform.view_all_orgs");
		expect(PERMISSIONS.PLATFORM.ELEVATE).toBe("platform.elevate");
		expect(PERMISSIONS.USERS.IMPERSONATE).toBe("users.impersonate");
	});

	it("exposes APPROVALS permission keys", () => {
		expect(PERMISSIONS.APPROVALS).toBeDefined();
		expect(PERMISSIONS.APPROVALS.OVERRIDE).toBe("approvals.override");
	});

	it("keeps users.impersonate out of the Organization Admin baseline catalog", async () => {
		const { getOrganizationAdminPermissionKeys } = await import(
			"@/constants/permissions"
		);
		expect(getOrganizationAdminPermissionKeys()).not.toContain(
			PERMISSIONS.USERS.IMPERSONATE,
		);
	});

	it("includes viewer and contract_reviewer role templates", () => {
		const ids = ROLE_TEMPLATES.map((t) => t.id);
		expect(ids).toContain("viewer");
		expect(ids).toContain("contract_reviewer");
		expect(ROLE_TEMPLATES.length).toBeGreaterThanOrEqual(2);
	});
});
