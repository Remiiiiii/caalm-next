export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import ExecutiveDashboard from "../ExecutiveDashboard";

export default async function ExecutiveDashboardPage() {
	// Try to get user from session first, then fall back to 2FA-based auth
	let currentUser = await getCurrentUser();

	if (!currentUser) {
		// If no session-based user, try 2FA-based user
		currentUser = await getCurrentUserFrom2FA();
	}

	if (!currentUser) {
		redirect("/sign-in");
	}

	return <ExecutiveDashboard user={currentUser} />;
}
