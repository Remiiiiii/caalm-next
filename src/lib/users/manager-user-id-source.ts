/**
 * Who owns users.managerUserId for an organization.
 * Stored on org.settings JSON (not a separate Appwrite column).
 *
 * "manual" — CAALM is the source of truth; reconnecting the assignment
 * graph may copy the new assigner onto managerUserId.
 * "scim" / unset — an IdP (or unknown source) owns the field; leave it alone.
 */

export type ManagerUserIdSource = "manual" | "scim";

export const DEFAULT_NEW_ORG_MANAGER_USER_ID_SOURCE: ManagerUserIdSource =
	"manual";

export function parseManagerUserIdSource(
	value: unknown,
): ManagerUserIdSource | null {
	if (value === "manual" || value === "scim") return value;
	return null;
}

/** True only when CAALM owns managerUserId. Unset/unknown does not sync. */
export function shouldSyncManagerUserIdOnReassign(source: unknown): boolean {
	return parseManagerUserIdSource(source) === "manual";
}
