/**
 * Role Helper Utilities
 * Utilities for checking user roles and access levels
 */

import {
	getUserDefaultOrganization,
	getUserRoles,
} from "@/lib/rbac/permissions";

/**
 * Check if user has Viewer role (read-only access)
 */
export async function isViewerRole(
	userId: string,
	orgId?: string,
): Promise<boolean> {
	try {
		const targetOrgId =
			orgId || (await getUserDefaultOrganization(userId))?.orgId;
		if (!targetOrgId) return false;

		const userRoles = await getUserRoles(userId, targetOrgId);
		return userRoles.some((ur) => ur.roleName === "Viewer");
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
			orgId || (await getUserDefaultOrganization(userId))?.orgId;
		if (!targetOrgId) return null;

		const userRoles = await getUserRoles(userId, targetOrgId);
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
