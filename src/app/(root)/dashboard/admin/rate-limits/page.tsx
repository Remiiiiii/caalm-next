/**
 * Rate Limit Monitoring Dashboard Page
 */

import { redirect } from "next/navigation";
import RateLimitMonitoring from "@/components/admin/RateLimitMonitoring";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";

export default async function RateLimitsPage() {
	// Try to get user from session first, then fall back to 2FA-based auth
	let currentUser = await getCurrentUser();
	if (!currentUser) {
		currentUser = await getCurrentUserFrom2FA();
	}

	if (!currentUser) {
		redirect("/sign-in");
	}

	return (
		<div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
			<RateLimitMonitoring />
		</div>
	);
}
