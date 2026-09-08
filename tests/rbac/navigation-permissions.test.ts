/**
 * Nav visibility regression: default role packs vs PERMISSION_BASED_NAV.
 * Ensures no role-name denylists are required for correct menus (issue #36).
 */

import { describe, expect, it } from "vitest";
import {
	hasNavigationPermission,
	PERMISSION_BASED_NAV,
} from "@/constants/navigation-permissions";
import {
	getOrganizationAdminPermissionKeys,
	PERMISSIONS,
	type PermissionKey,
} from "@/constants/permissions";
import { DEFAULT_ROLES } from "@/lib/database/seeds/default-roles";

function packFor(roleName: string): PermissionKey[] {
	const role = DEFAULT_ROLES.find((r) => r.name === roleName);
	if (!role) throw new Error(`Missing seed role: ${roleName}`);
	return role.permissions as PermissionKey[];
}

function visibleNames(held: PermissionKey[]): string[] {
	const names: string[] = [];
	for (const section of PERMISSION_BASED_NAV) {
		for (const item of section.items) {
			if (hasNavigationPermission(held, item)) {
				names.push(item.name);
			}
		}
	}
	return names;
}

describe("navigation permissions (issue #36)", () => {
	it("has no hiddenForRoles fields on nav items", () => {
		for (const section of PERMISSION_BASED_NAV) {
			for (const item of section.items) {
				expect(Object.hasOwn(item, "hiddenForRoles")).toBe(false);
			}
		}
	});

	it("System Settings requires platform.system_settings only", () => {
		const system = PERMISSION_BASED_NAV.flatMap((s) => s.items).find(
			(i) => i.name === "System Settings",
		);
		expect(system?.permissions).toEqual([PERMISSIONS.PLATFORM.SYSTEM_SETTINGS]);
	});

	it("Viewer sees My Contracts/Department Licenses but not org-wide All lists or Uploads", () => {
		const names = visibleNames(packFor("Viewer"));
		expect(names).toContain("My Contracts");
		expect(names).toContain("Department Licenses");
		expect(names).toContain("Calendar View");
		expect(names).not.toContain("All Contracts");
		expect(names).not.toContain("All Licenses");
		expect(names).not.toContain("Uploads");
		expect(names).not.toContain("Assign Tasks");
		expect(names).not.toContain("System Settings");
		expect(names).not.toContain("Advanced Resources");
		expect(names).not.toContain("Create Contract");
	});

	it("Department Manager does not see org-wide All Contracts/Licenses or System Settings", () => {
		const names = visibleNames(packFor("Department Manager"));
		expect(names).not.toContain("All Contracts");
		expect(names).not.toContain("All Licenses");
		expect(names).toContain("Department Licenses");
		expect(names).toContain("My Contracts");
		expect(names).not.toContain("System Settings");
		expect(names).not.toContain("C Suite");
		expect(names).not.toContain("Advanced Resources");
		expect(names).not.toContain("Create Contract");
	});

	it("Organization Admin does not see System Settings", () => {
		const orgAdminKeys =
			getOrganizationAdminPermissionKeys() as PermissionKey[];
		const names = visibleNames(orgAdminKeys);
		expect(names).not.toContain("System Settings");
		expect(names).toContain("Organization Settings");
		expect(names).toContain("Billing & Integrations");
		expect(names).toContain("All Contracts");
		expect(names).toContain("Create Contract");
	});

	it("Super Admin sees System Settings", () => {
		const names = visibleNames(packFor("Super Admin"));
		expect(names).toContain("System Settings");
	});
});
