import { EventCheckInClient } from "@/app/(root)/events/check-in/EventCheckInClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function EventCheckInPage() {
	await requirePagePermission(PERMISSIONS.EVENTS.INVITE);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">Event Check-in</h1>
			</div>
			<p className="text-sm text-slate-600 mb-6 max-w-4xl">
				Scan or paste a registration QR token to check guests in at the door.
			</p>
			<EventCheckInClient />
		</div>
	);
}
