/**
 * Permission implications: holding a broader permission satisfies a narrower check.
 * Example: calendar.view_all implies calendar.view_team and calendar.view_own.
 */

import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";

/**
 * Map of permission → permissions that also satisfy it (broader keys).
 * If the user holds any listed key, they pass a check for the map key.
 */
export const PERMISSION_IMPLICATIONS: Partial<
	Record<PermissionKey, PermissionKey[]>
> = {
	[PERMISSIONS.CALENDAR.VIEW_OWN]: [
		PERMISSIONS.CALENDAR.VIEW_TEAM,
		PERMISSIONS.CALENDAR.VIEW_ALL,
	],
	[PERMISSIONS.CALENDAR.VIEW_TEAM]: [PERMISSIONS.CALENDAR.VIEW_ALL],
	[PERMISSIONS.CALENDAR.EDIT_OWN]: [PERMISSIONS.CALENDAR.EDIT_ALL],
	[PERMISSIONS.CALENDAR.DELETE_OWN]: [PERMISSIONS.CALENDAR.DELETE_ALL],

	[PERMISSIONS.CONTRACTS.VIEW]: [
		PERMISSIONS.CONTRACTS.VIEW_OWN,
		PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT,
		PERMISSIONS.CONTRACTS.VIEW_ALL,
		PERMISSIONS.CONTRACTS.REVIEW,
		PERMISSIONS.CONTRACTS.APPROVE,
	],
	[PERMISSIONS.CONTRACTS.VIEW_OWN]: [
		PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT,
		PERMISSIONS.CONTRACTS.VIEW_ALL,
	],
	[PERMISSIONS.CONTRACTS.VIEW_DEPARTMENT]: [PERMISSIONS.CONTRACTS.VIEW_ALL],

	[PERMISSIONS.LICENSES.VIEW]: [
		PERMISSIONS.LICENSES.VIEW_OWN,
		PERMISSIONS.LICENSES.VIEW_DEPARTMENT,
		PERMISSIONS.LICENSES.VIEW_ALL,
		PERMISSIONS.LICENSES.APPROVE,
	],
	[PERMISSIONS.LICENSES.VIEW_OWN]: [
		PERMISSIONS.LICENSES.VIEW_DEPARTMENT,
		PERMISSIONS.LICENSES.VIEW_ALL,
	],
	[PERMISSIONS.LICENSES.VIEW_DEPARTMENT]: [PERMISSIONS.LICENSES.VIEW_ALL],
};

/**
 * True if `held` contains `required` or any permission that implies `required`.
 */
export function permissionSatisfied(
	held: Iterable<string>,
	required: PermissionKey,
): boolean {
	const set = held instanceof Set ? held : new Set(held);
	if (set.has(required)) return true;
	const implicators = PERMISSION_IMPLICATIONS[required];
	if (!implicators?.length) return false;
	return implicators.some((key) => set.has(key));
}

/**
 * Expand a held permission set with all keys satisfied via implication.
 * Useful for UI "effective access" displays.
 */
export function expandEffectivePermissions(
	held: Iterable<string>,
): Set<string> {
	const set = new Set(held);
	for (const [narrow, broads] of Object.entries(PERMISSION_IMPLICATIONS)) {
		if (set.has(narrow)) continue;
		if (broads?.some((b) => set.has(b))) {
			set.add(narrow);
		}
	}
	return set;
}
