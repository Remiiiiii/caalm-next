/**
 * Role Helper Utilities
 * Utilities for checking user roles and access levels
 *
 * Note: getUserRoles lives in a "use server" module. Load it lazily so route
 * handlers don't end up with a broken named binding under Turbopack.
 */

async function loadUserRoles(userId: string, orgId: string) {
	const { getUserRoles } = await import("@/lib/rbac/permissions");
	return getUserRoles(userId, orgId);
}

/**
 * Check if user has Viewer role (read-only access)
 */
export async function isViewerRole(
	userId: string,
	orgId?: string,
): Promise<boolean> {
	try {
		const targetOrgId =
			orgId ||
			(await import("@/lib/rbac/permissions").then((m) =>
				m.getUserDefaultOrganization(userId),
			))?.orgId;
		if (!targetOrgId) return false;

		const userRoles = await loadUserRoles(userId, targetOrgId);
		return userRoles.some((ur) => ur.roleName === "Viewer");
	} catch {
		return false;
	}
}

/** True when the user holds Super Admin or Organization Admin. */
export async function isExecOrOrgAdmin(
	userId: string,
	orgId?: string,
): Promise<boolean> {
	if (!orgId) return false;
	try {
		const userRoles = await loadUserRoles(userId, orgId);
		return userRoles.some((ur) => {
			const name = ur.roleName || "";
			return name === "Super Admin" || name === "Organization Admin";
		});
	} catch {
		return false;
	}
}

/** True when the user holds the Executive RBAC role (approval pool membership). */
export async function isExecutiveRole(
	userId: string,
	orgId?: string,
): Promise<boolean> {
	if (!orgId) return false;
	try {
		const userRoles = await loadUserRoles(userId, orgId);
		return userRoles.some((ur) => ur.roleName === "Executive");
	} catch {
		return false;
	}
}

/**
 * Get user's primary role name
 */
export async function getUserPrimaryRole(
	userId: string,
	orgId?: string,
): Promise<string | null> {
	try {
		const targetOrgId =
			orgId ||
			(await import("@/lib/rbac/permissions").then((m) =>
				m.getUserDefaultOrganization(userId),
			))?.orgId;
		if (!targetOrgId) return null;

		const userRoles = await loadUserRoles(userId, targetOrgId);
		return userRoles[0]?.roleName || null;
	} catch {
		return null;
	}
}

/**
 * Role badge icon mapping
 */
export const ROLE_BADGE_ICONS: Record<string, string> = {
	"Super Admin": "Crown",
	"Organization Admin": "Building2",
	Executive: "Crown",
	"Department Manager": "Building",
	Viewer: "Eye",
};

/**
 * Get role badge icon name
 */
export function getRoleBadgeIcon(roleName: string | null): string {
	if (!roleName) return "User";
	return ROLE_BADGE_ICONS[roleName] || "User";
}
