/**
 * Separation of duties: DB-backed validators for role assignment.
 * Pure conflict rules live in sod-rules.ts (client-safe).
 */

import type { PermissionKey } from "@/constants/permissions";
import { getRole, getRolePermissions } from "@/lib/rbac/roles";
import {
	type SodResult,
	validatePermissionsForSod,
} from "@/lib/rbac/sod-rules";

export {
	SOD_CONFLICT_PAIRS,
	findSodConflicts,
	validatePermissionsForSod,
	type SodResult,
} from "@/lib/rbac/sod-rules";

export async function validateRoleAssignmentForSod(
	roleId: string,
): Promise<SodResult> {
	const role = await getRole(roleId);
	const keys = await getRolePermissions(roleId);
	return validatePermissionsForSod(keys, {
		isSystemRole: Boolean(role?.isSystemRole),
	});
}

/**
 * Validate the union of permissions across multiple roles (multi-role SoD).
 */
export async function validateRoleIdsUnionForSod(
	roleIds: string[],
): Promise<SodResult> {
	const all = new Set<PermissionKey>();
	let allSystem = true;
	for (const roleId of roleIds) {
		const role = await getRole(roleId);
		if (!role?.isSystemRole) {
			allSystem = false;
		}
		const keys = await getRolePermissions(roleId);
		for (const key of keys) {
			all.add(key);
		}
	}
	return validatePermissionsForSod([...all], { isSystemRole: allSystem });
}
