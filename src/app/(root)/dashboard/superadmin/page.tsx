export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import ExecutiveDashboard from "../ExecutiveDashboard";

export default async function SuperAdminDashboardPage() {
	// Try to get user from session first, then fall back to 2FA-based auth
	let currentUser = await getCurrentUser();
	if (!currentUser) {
		currentUser = await getCurrentUserFrom2FA();
	}

	if (!currentUser) {
		redirect("/sign-in");
	}

	return <ExecutiveDashboard user={currentUser} />;
}
