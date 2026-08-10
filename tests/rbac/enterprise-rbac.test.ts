/**
 * RBAC unit tests: SoD, implications, authorize helpers.
 */

import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/constants/permissions";
import {
	expandEffectivePermissions,
	permissionSatisfied,
} from "@/lib/rbac/permission-implications";
import {
	findSodConflicts,
	validatePermissionsForSod,
} from "@/lib/rbac/sod-rules";

describe("permission implications", () => {
	it("treats view_all as satisfying view_own", () => {
		expect(
			permissionSatisfied(
				[PERMISSIONS.CALENDAR.VIEW_ALL],
				PERMISSIONS.CALENDAR.VIEW_OWN,
			),
		).toBe(true);
	});

	it("does not treat view_own as satisfying view_all", () => {
		expect(
			permissionSatisfied(
				[PERMISSIONS.CALENDAR.VIEW_OWN],
				PERMISSIONS.CALENDAR.VIEW_ALL,
			),
		).toBe(false);
	});

	it("expands effective permissions for UI truth", () => {
		const expanded = expandEffectivePermissions([
			PERMISSIONS.CONTRACTS.VIEW_ALL,
		]);
		expect(expanded.has(PERMISSIONS.CONTRACTS.VIEW_OWN)).toBe(true);
		expect(expanded.has(PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT)).toBe(true);
	});
});

describe("separation of duties", () => {
	it("blocks create + approve on custom roles", () => {
		const result = validatePermissionsForSod(
			[PERMISSIONS.CONTRACTS.CREATE, PERMISSIONS.CONTRACTS.APPROVE],
			{ isSystemRole: false },
		);
		expect(result.ok).toBe(false);
	});

	it("allows create + approve on system roles with warning", () => {
		const result = validatePermissionsForSod(
			[PERMISSIONS.CONTRACTS.CREATE, PERMISSIONS.CONTRACTS.APPROVE],
			{ isSystemRole: true },
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.warnings?.length).toBeGreaterThan(0);
		}
	});

	it("allows break-glass diagnose holders to keep recovery roles", () => {
		const result = validatePermissionsForSod(
			[
				PERMISSIONS.CONTRACTS.CREATE,
				PERMISSIONS.CONTRACTS.APPROVE,
				PERMISSIONS.PLATFORM.DIAGNOSE,
			],
			{ isSystemRole: false },
		);
		expect(result.ok).toBe(true);
	});

	it("finds license create/approve conflicts", () => {
		const conflicts = findSodConflicts([
			PERMISSIONS.LICENSES.CREATE,
			PERMISSIONS.LICENSES.APPROVE,
		]);
		expect(conflicts.length).toBe(1);
	});

	it("does not exempt assign_roles alone from SoD", () => {
		const result = validatePermissionsForSod(
			[
				PERMISSIONS.CONTRACTS.CREATE,
				PERMISSIONS.CONTRACTS.APPROVE,
				PERMISSIONS.USERS.ASSIGN_ROLES,
			],
			{ isSystemRole: false },
		);
		expect(result.ok).toBe(false);
	});
});
