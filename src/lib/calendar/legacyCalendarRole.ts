import type { UserRole } from "@/constants/rbac";

/**
 * Legacy calendar role label for older UI only — not used for authz.
 * Calendar gates use org permission keys via evaluateCalendarPermission /
 * useCalendarPermissions — do not add new call sites that treat this as authz.
 *
 * IT maps to viewer (matches VIEW_OWN pack), not admin.
 */
export function calendarRoleFromRbacName(roleName: string): UserRole {
	const name = roleName.trim();
	if (name === "Super Admin" || name === "Organization Admin") return "admin";
	if (name === "Department Manager") return "approver";
	if (name === "Viewer") return "viewer";
	if (name === "IT") return "viewer";
	return "viewer";
}
