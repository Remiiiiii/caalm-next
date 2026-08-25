/**
 * License UI action gates — permission keys only (matches API requirePermission).
 */

import { PERMISSIONS, type PermissionKey } from "@/constants/permissions";
import { permissionSatisfied } from "@/lib/rbac/permission-implications";

export type LicenseUiAction =
	| "view"
	| "create"
	| "edit"
	| "delete"
	| "allocate"
	| "renew"
	| "approve";

const ACTION_TO_KEY: Record<LicenseUiAction, PermissionKey> = {
	view: PERMISSIONS.LICENSES.VIEW,
	create: PERMISSIONS.LICENSES.CREATE,
	edit: PERMISSIONS.LICENSES.EDIT,
	delete: PERMISSIONS.LICENSES.DELETE,
	allocate: PERMISSIONS.LICENSES.ALLOCATE,
	renew: PERMISSIONS.LICENSES.RENEW,
	approve: PERMISSIONS.LICENSES.APPROVE,
};

export function canLicenseAction(
	held: Iterable<string>,
	action: LicenseUiAction,
): boolean {
	return permissionSatisfied(held, ACTION_TO_KEY[action]);
}
