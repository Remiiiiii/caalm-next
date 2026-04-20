export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";

// Lazy load the heavy calendar component to reduce initial compilation time
const OutlookStyleCalendar = dynamicImport(
	() => import("@/components/OutlookStyleCalendar"),
	{
		loading: () => (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-pulse text-slate-600">Loading calendar...</div>
			</div>
		),
	},
);

export default async function CalendarPage() {
	// Try to get user from session first, then fall back to 2FA-based auth
	let currentUser = await getCurrentUser();
	if (!currentUser) {
		currentUser = await getCurrentUserFrom2FA();
	}

	if (!currentUser) {
		redirect("/sign-in");
	}

	return <OutlookStyleCalendar user={currentUser} />;
}
