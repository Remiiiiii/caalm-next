/**
 * Server page authorization helpers for dashboard and settings routes.
 */

import { redirect } from "next/navigation";
import type { PermissionKey } from "@/constants/permissions";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import { authorize } from "@/lib/rbac/authorize";
import {
	getDashboardProfileRedirect,
	getUnauthorizedDashboardRedirect,
} from "@/lib/rbac/dashboard-access-policy";

export async function getSessionUser() {
	let currentUser = await getCurrentUser();
	if (!currentUser) {
		currentUser = await getCurrentUserFrom2FA();
	}
	return currentUser;
}

/**
 * Require sign-in; redirect to sign-in if missing.
 */
export async function requirePageAuth() {
	const user = await getSessionUser();
	if (!user) {
		redirect("/sign-in");
	}
	return user;
}

/**
 * Require permission(s) for a page. Redirects to /dashboard on deny.
 */
export async function requirePagePermission(
	permission: PermissionKey | PermissionKey[],
	options?: { requireAll?: boolean; orgId?: string },
) {
	const user = await requirePageAuth();
	const decision = await authorize({
		userId: user.$id,
		orgId: options?.orgId,
		permission,
		requireAll: options?.requireAll,
	});
	if (!decision.allowed) {
		redirect("/dashboard");
	}
	return user;
}

/**
 * Enforce dashboard path policy (permissions + optional role IDs).
 */
export async function requireDashboardPathAccess(pathname: string) {
	const user = await requirePageAuth();
	const dest = await getUnauthorizedDashboardRedirect(user.$id, pathname);
	if (dest) {
		redirect(dest);
	}

	const profileDest = await getDashboardProfileRedirect(user.$id, pathname, {
		division: user.division,
		department: (user as { department?: string }).department,
		departmentLabel: (user as { departmentLabel?: string }).departmentLabel,
	});
	if (profileDest) {
		redirect(profileDest);
	}

	return user;
}
