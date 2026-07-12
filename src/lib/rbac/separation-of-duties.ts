/**
 * Separation of duties: block role assignments whose permission set mixes conflicting duties.
 * Roles that include elevated admin capabilities (e.g. role assignment) skip SoD checks.
 */

import type { PermissionKey } from "@/constants/permissions";
import { PERMISSIONS } from "@/constants/permissions";
import { getRolePermissions } from "@/lib/rbac/roles";

export const SOD_CONFLICT_PAIRS: Array<[PermissionKey, PermissionKey]> = [
	[PERMISSIONS.CONTRACTS.CREATE, PERMISSIONS.CONTRACTS.APPROVE],
	[PERMISSIONS.EVENTS.INVITE, PERMISSIONS.EVENTS.APPROVE],
];

export function validatePermissionsForSod(
	permissionKeys: PermissionKey[],
): { ok: true } | { ok: false; message: string } {
	const set = new Set(permissionKeys);

	if (set.has(PERMISSIONS.USERS.ASSIGN_ROLES)) {
		return { ok: true };
	}

	for (const [a, b] of SOD_CONFLICT_PAIRS) {
		if (set.has(a) && set.has(b)) {
			return {
				ok: false,
				message: `Conflicting permissions: ${a} and ${b} cannot be combined on the same role (separation of duties).`,
			};
		}
	}

	return { ok: true };
}

export async function validateRoleAssignmentForSod(
	roleId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
	const keys = await getRolePermissions(roleId);
	return validatePermissionsForSod(keys);
}
