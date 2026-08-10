/**
 * Pure separation-of-duties helpers (safe for client + server).
 * DB-backed validators live in separation-of-duties.ts.
 */

import type { PermissionKey } from "@/constants/permissions";
import { PERMISSIONS } from "@/constants/permissions";

export const SOD_CONFLICT_PAIRS: Array<[PermissionKey, PermissionKey]> = [
	[PERMISSIONS.CONTRACTS.CREATE, PERMISSIONS.CONTRACTS.APPROVE],
	[PERMISSIONS.CONTRACTS.CREATE, PERMISSIONS.CONTRACTS.SIGN],
	[PERMISSIONS.CONTRACTS.EDIT, PERMISSIONS.CONTRACTS.APPROVE],
	[PERMISSIONS.EVENTS.INVITE, PERMISSIONS.EVENTS.APPROVE],
	[PERMISSIONS.LICENSES.CREATE, PERMISSIONS.LICENSES.APPROVE],
	[PERMISSIONS.LICENSES.EDIT, PERMISSIONS.LICENSES.APPROVE],
];

export type SodResult =
	| { ok: true; warnings?: Array<[string, string]> }
	| { ok: false; message: string; pair?: [string, string] };

function humanPermission(key: string): string {
	return key.replace(/\./g, " → ");
}

export function findSodConflicts(
	permissionKeys: PermissionKey[],
): Array<[PermissionKey, PermissionKey]> {
	const set = new Set(permissionKeys);
	const conflicts: Array<[PermissionKey, PermissionKey]> = [];
	for (const [a, b] of SOD_CONFLICT_PAIRS) {
		if (set.has(a) && set.has(b)) {
			conflicts.push([a, b]);
		}
	}
	return conflicts;
}

export function validatePermissionsForSod(
	permissionKeys: PermissionKey[],
	options?: { isSystemRole?: boolean; allowBreakGlassExempt?: boolean },
): SodResult {
	const conflicts = findSodConflicts(permissionKeys);
	if (conflicts.length === 0) {
		return { ok: true };
	}

	if (options?.isSystemRole) {
		return { ok: true, warnings: conflicts };
	}

	const set = new Set(permissionKeys);
	if (
		options?.allowBreakGlassExempt !== false &&
		set.has(PERMISSIONS.PLATFORM.DIAGNOSE)
	) {
		return { ok: true, warnings: conflicts };
	}

	const [a, b] = conflicts[0];
	return {
		ok: false,
		pair: [a, b],
		message: `Separation of duties: “${humanPermission(a)}” and “${humanPermission(b)}” cannot be on the same custom role. Split these across two roles or two people.`,
	};
}
