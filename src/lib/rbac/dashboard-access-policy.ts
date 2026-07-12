/**
 * Single source of truth for dashboard path access and default home resolution.
 * Guards use permission checks; optional allowedRoleIds disambiguate paths that share permissions.
 */

import type { PermissionKey } from "@/constants/permissions";
import { PERMISSIONS } from "@/constants/permissions";
import {
	getUserDefaultOrganization,
	getUserPermissions,
	getUserRoles,
	hasAllPermissions,
	hasAnyPermission,
} from "@/lib/rbac/permissions";
import { ROLE_DASHBOARD_FALLBACK } from "@/lib/rbac/role-dashboard-metadata";

export type DashboardPolicyEntry = {
	pathPrefix: string;
	/** User must have at least one of these (unless requireAll) */
	anyOf?: PermissionKey[];
	requireAll?: boolean;
	/** If set, user must hold one of these role row IDs */
	allowedRoleIds?: string[];
};

/**
 * Longer prefixes first so `/dashboard/superadmin` wins over `/dashboard`.
 */
export const DASHBOARD_ROUTE_POLICY: DashboardPolicyEntry[] = [
	{
		pathPrefix: "/dashboard/superadmin",
		anyOf: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
		allowedRoleIds: ["role_super_admin"],
	},
	{
		pathPrefix: "/dashboard/organizationadmin",
		anyOf: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
		allowedRoleIds: ["role_org_admin"],
	},
	{
		pathPrefix: "/dashboard/departmentmanager",
		anyOf: [PERMISSIONS.CALENDAR.VIEW_TEAM, PERMISSIONS.CONTRACTS.VIEW],
		allowedRoleIds: ["role_dept_manager"],
	},
	{
		pathPrefix: "/dashboard/viewer",
		anyOf: [PERMISSIONS.CALENDAR.VIEW_OWN, PERMISSIONS.CONTRACTS.VIEW],
		allowedRoleIds: ["role_viewer"],
	},
	{
		pathPrefix: "/dashboard/it",
		anyOf: [PERMISSIONS.IT.VIEW_MONITORING],
		allowedRoleIds: ["role_it_staff"],
	},
	{
		pathPrefix: "/dashboard/content-creator",
		anyOf: [
			PERMISSIONS.NEWS.READ,
			PERMISSIONS.NEWS.CREATE,
			PERMISSIONS.NEWS.UPDATE,
		],
	},
	{
		pathPrefix: "/dashboard/admin/roles",
		anyOf: [PERMISSIONS.USERS.ASSIGN_ROLES],
	},
	{
		pathPrefix: "/dashboard/admin",
		anyOf: [PERMISSIONS.SETTINGS.VIEW, PERMISSIONS.USERS.ASSIGN_ROLES],
	},
	{
		pathPrefix: "/dashboard/user-management",
		anyOf: [PERMISSIONS.USERS.VIEW, PERMISSIONS.USERS.INVITE],
	},
];

/** Canonical order for picking a home when role metadata does not resolve */
const CANONICAL_HOME_CANDIDATES: string[] = [
	"/dashboard/superadmin",
	"/dashboard/it",
	"/dashboard/organizationadmin",
	"/dashboard/content-creator",
	"/dashboard/departmentmanager",
	"/dashboard/viewer",
];

export function getPolicyEntryForPath(
	pathname: string,
): DashboardPolicyEntry | null {
	const sorted = [...DASHBOARD_ROUTE_POLICY].sort(
		(a, b) => b.pathPrefix.length - a.pathPrefix.length,
	);
	for (const entry of sorted) {
		if (pathname.startsWith(entry.pathPrefix)) {
			return entry;
		}
	}
	return null;
}

function roleIdsHeld(roles: Array<{ roleId: string }>): Set<string> {
	return new Set(roles.map((r) => r.roleId));
}

/**
 * Returns whether the user may access `pathname` under /dashboard given org context.
 */
export async function userMayAccessDashboardPath(
	userId: string,
	orgId: string,
	pathname: string,
): Promise<boolean> {
	const entry = getPolicyEntryForPath(pathname);
	if (!entry) {
		return true;
	}

	const userRoles = await getUserRoles(userId, orgId);
	const heldRoleIds = roleIdsHeld(userRoles);

	if (entry.allowedRoleIds?.length) {
		const okRole = entry.allowedRoleIds.some((id) => heldRoleIds.has(id));
		if (!okRole) {
			return false;
		}
	}

	if (!entry.anyOf?.length) {
		return true;
	}

	if (entry.requireAll) {
		return hasAllPermissions(userId, entry.anyOf, orgId);
	}
	return hasAnyPermission(userId, entry.anyOf, orgId);
}

/**
 * Resolve default dashboard URL for a user (for `/dashboard` index redirect).
 */
export async function resolveDashboardHomePath(
	userId: string,
	orgId: string,
): Promise<string | null> {
	const permissions = await getUserPermissions(userId, orgId);
	const userRoles = await getUserRoles(userId, orgId);

	if (!userRoles.length && !permissions.length) {
		return null;
	}

	const sortedRoles = [...userRoles].sort(
		(a, b) => (a.priority ?? 9999) - (b.priority ?? 9999),
	);

	for (const r of sortedRoles) {
		const home =
			r.homeDashboardPath?.trim() ||
			ROLE_DASHBOARD_FALLBACK[r.roleId]?.homeDashboardPath;
		if (!home) {
			continue;
		}
		if (await userMayAccessDashboardPath(userId, orgId, home)) {
			return home;
		}
	}

	for (const candidate of CANONICAL_HOME_CANDIDATES) {
		if (await userMayAccessDashboardPath(userId, orgId, candidate)) {
			return candidate;
		}
	}

	if (
		permissions.includes(PERMISSIONS.CONTRACTS.VIEW) ||
		permissions.includes(PERMISSIONS.CALENDAR.VIEW_OWN)
	) {
		return "/dashboard/viewer";
	}

	return null;
}

/**
 * Server helper: resolve org + home path; returns null if user/org missing.
 */
export async function resolveDashboardHomePathForCurrentUser(
	userId: string,
): Promise<{ orgId: string; path: string } | null> {
	const defaultOrg = await getUserDefaultOrganization(userId);
	if (!defaultOrg) {
		return null;
	}
	const path = await resolveDashboardHomePath(userId, defaultOrg.orgId);
	if (!path) {
		return null;
	}
	return { orgId: defaultOrg.orgId, path };
}

/**
 * For server components: returns redirect path if user may not access `pathname`, else null.
 */
export async function getUnauthorizedDashboardRedirect(
	userId: string,
	pathname: string,
): Promise<string | null> {
	const defaultOrg = await getUserDefaultOrganization(userId);
	if (!defaultOrg) {
		return "/sign-in";
	}
	if (await userMayAccessDashboardPath(userId, defaultOrg.orgId, pathname)) {
		return null;
	}
	return (
		(await resolveDashboardHomePath(userId, defaultOrg.orgId)) ?? "/dashboard"
	);
}
