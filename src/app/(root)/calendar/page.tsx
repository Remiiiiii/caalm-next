export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import { LoadingSpinner } from "@/components/ui/loading";

// Lazy load the heavy calendar component to reduce initial compilation time
const OutlookStyleCalendar = dynamicImport(
	() => import("@/components/OutlookStyleCalendar"),
	{
		loading: () => (
			<div className="flex min-h-screen items-center justify-center">
				<LoadingSpinner size="lg" label="Loading calendar..." className="!p-0" />
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
