/**
 * Role Priority Utilities
 * Consistent role prioritization across the application
 */

/**
 * Fallback order when numeric `priority` is missing (unmigrated envs).
 */
export const ROLE_PRIORITY_ORDER = [
	"Super Admin",
	"IT",
	"Organization Admin",
	"Content Creator",
	"Department Manager",
	"Viewer",
] as const;

function nameFallbackRank(roleName?: string | null): number {
	if (!roleName) {
		return 9999;
	}
	const idx = (ROLE_PRIORITY_ORDER as readonly string[]).indexOf(roleName);
	if (idx === -1) {
		return 5000;
	}
	return (idx + 1) * 100;
}

/**
 * Get the highest priority role from a list of roles (lowest `priority` wins).
 */
export function getHighestPriorityRole(
	roles: Array<{
		roleName?: string | null;
		priority?: number;
	}>,
): string | null {
	if (!roles || roles.length === 0) {
		return null;
	}

	const sorted = [...roles].sort((a, b) => {
		const pa =
			typeof a.priority === "number"
				? a.priority
				: nameFallbackRank(a.roleName);
		const pb =
			typeof b.priority === "number"
				? b.priority
				: nameFallbackRank(b.roleName);
		return pa - pb;
	});

	return sorted[0]?.roleName || null;
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
