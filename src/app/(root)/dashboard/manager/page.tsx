export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import { getUnauthorizedDashboardRedirect } from "@/lib/rbac/dashboard-access-policy";

/**
 * Legacy manager route — redirect to the guarded department manager dashboard.
 */
export default async function ManagerDashboardPage() {
	let currentUser = await getCurrentUser();
	if (!currentUser) {
		currentUser = await getCurrentUserFrom2FA();
	}

	if (!currentUser) {
		redirect("/sign-in");
	}

	const guard = await getUnauthorizedDashboardRedirect(
		currentUser.$id,
		"/dashboard/departmentmanager",
	);
	if (guard) {
		redirect(guard);
	}

	redirect("/dashboard/departmentmanager");
}
