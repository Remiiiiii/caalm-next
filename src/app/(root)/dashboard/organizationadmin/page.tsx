export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import { getUnauthorizedDashboardRedirect } from "@/lib/rbac/dashboard-access-policy";
import AdminDashboard from "../AdminDashboard";

export default async function OrganizationAdminDashboardPage() {
	let currentUser = await getCurrentUser();
	if (!currentUser) {
		currentUser = await getCurrentUserFrom2FA();
	}

	if (!currentUser) {
		redirect("/sign-in");
	}

	const guard = await getUnauthorizedDashboardRedirect(
		currentUser.$id,
		"/dashboard/organizationadmin",
	);
	if (guard) {
		redirect(guard);
	}

	return <AdminDashboard user={currentUser} />;
}
