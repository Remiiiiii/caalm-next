/**
 * Role Priority Utilities
 * Consistent role prioritization across the application
 */

/**
 * Role priority order (highest to lowest)
 * When a user has multiple roles, the highest priority role is used for routing
 */
export const ROLE_PRIORITY_ORDER = [
	"Super Admin",
	"IT",
	"Organization Admin",
	"Department Manager",
	"Viewer",
] as const;

/**
 * Get the highest priority role from a list of roles
 * @param roles - Array of role objects with roleName property
 * @returns The highest priority role name, or null if no roles
 */
export function getHighestPriorityRole(
	roles: Array<{ roleName?: string | null }>,
): string | null {
	if (!roles || roles.length === 0) {
		return null;
	}

	// Find the highest priority role
	for (const priority of ROLE_PRIORITY_ORDER) {
		const role = roles.find((r) => r.roleName === priority);
		if (role?.roleName) {
			return role.roleName;
		}
	}

	// Fallback to first role if no priority match
	return roles[0]?.roleName || null;
}

/**
 * Get the highest priority role name from a list of role name strings
 * @param roleNames - Array of role name strings
 * @returns The highest priority role name, or null if no roles
 */
export function getHighestPriorityRoleName(
	roleNames: Array<string | null | undefined>,
): string | null {
	if (!roleNames || roleNames.length === 0) {
		return null;
	}

	const validRoleNames = roleNames.filter((name): name is string => !!name);

	// Find the highest priority role
	for (const priority of ROLE_PRIORITY_ORDER) {
		if (validRoleNames.includes(priority)) {
			return priority;
		}
	}

	// Fallback to first role if no priority match
	return validRoleNames[0] || null;
}
