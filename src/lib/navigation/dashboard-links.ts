import type { PermissionKey } from "@/constants/permissions";
import { PERMISSIONS } from "@/constants/permissions";
import {
	isITDepartment,
	type DepartmentProfileFields,
} from "@/lib/rbac/it-department";

export type DashboardSwitchLink = {
	name: string;
	url: string;
	permissions: PermissionKey[];
	/** When set, user must hold this role name to see the link (unless permissionOnly). */
	roleName?: string;
	/**
	 * When true, show the link whenever the user has any of `permissions`
	 * — role assignment is not required.
	 */
	permissionOnly?: boolean;
	/** IT portal: also require department/departmentLabel === IT */
	requireITDepartment?: boolean;
};

/**
 * Shared dashboard switcher entries (sidebar + IT portal).
 * Access is always permission-checked; some entries also require a role name.
 */
export const DASHBOARD_SWITCH_LINKS: DashboardSwitchLink[] = [
	{
		name: "Super Admin",
		roleName: "Super Admin",
		url: "/dashboard/superadmin",
		permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
	},
	{
		name: "Organization Admin",
		roleName: "Organization Admin",
		url: "/dashboard/organizationadmin",
		permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
	},
	{
		name: "Department Manager",
		roleName: "Department Manager",
		url: "/dashboard/departmentmanager",
		permissions: [
			PERMISSIONS.CALENDAR.VIEW_TEAM,
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.CONTRACTS.REVIEW,
			PERMISSIONS.CONTRACTS.APPROVE,
		],
	},
	{
		name: "Viewer",
		roleName: "Viewer",
		url: "/dashboard/viewer",
		permissions: [PERMISSIONS.CALENDAR.VIEW_OWN, PERMISSIONS.CONTRACTS.VIEW],
	},
	{
		name: "IT",
		url: "/dashboard/it",
		permissions: [PERMISSIONS.IT.VIEW_MONITORING],
		// Department + permission (not role name): Super Admin in IT can enter;
		// Org Admin outside IT cannot.
		permissionOnly: true,
		requireITDepartment: true,
	},
	{
		name: "Content Creator",
		roleName: "Content Creator",
		url: "/dashboard/content-creator",
		permissions: [
			PERMISSIONS.NEWS.READ,
			PERMISSIONS.NEWS.CREATE,
			PERMISSIONS.NEWS.UPDATE,
		],
	},
];

export function userHasAnyPermission(
	permissions: string[],
	required: PermissionKey[],
): boolean {
	return required.some((perm) => permissions.includes(perm));
}

/**
 * Build dashboard switcher links the current user may open.
 */
export function resolveAccessibleDashboardLinks(
	permissions: string[],
	roleNames: string[],
	profile?: DepartmentProfileFields,
): Array<{ name: string; url: string; permissions: PermissionKey[] }> {
	const roleSet = new Set(roleNames);
	const seen = new Set<string>();
	const links: Array<{
		name: string;
		url: string;
		permissions: PermissionKey[];
	}> = [];

	for (const entry of DASHBOARD_SWITCH_LINKS) {
		if (seen.has(entry.url)) continue;
		if (!userHasAnyPermission(permissions, entry.permissions)) continue;

		if (entry.requireITDepartment && !isITDepartment(profile ?? {})) {
			continue;
		}

		const roleOk =
			entry.permissionOnly ||
			(entry.roleName ? roleSet.has(entry.roleName) : true);
		if (!roleOk) continue;

		seen.add(entry.url);
		links.push({
			name: entry.name,
			url: entry.url,
			permissions: entry.permissions,
		});
	}

	return links;
}

export function canAccessITPortal(
	permissions: string[],
	profile?: DepartmentProfileFields,
): boolean {
	return (
		isITDepartment(profile ?? {}) &&
		permissions.includes(PERMISSIONS.IT.VIEW_MONITORING)
	);
}
