export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import { getUnauthorizedDashboardRedirect } from "@/lib/rbac/dashboard-access-policy";
import ExecutiveDashboard from "../ExecutiveDashboard";

export default async function ViewerDashboardPage() {
	let currentUser = await getCurrentUser();

	if (!currentUser) {
		currentUser = await getCurrentUserFrom2FA();
	}

	if (!currentUser) {
		redirect("/sign-in");
	}

	const guard = await getUnauthorizedDashboardRedirect(
		currentUser.$id,
		"/dashboard/viewer",
	);
	if (guard) {
		redirect(guard);
	}

	return <ExecutiveDashboard user={currentUser} />;
}
