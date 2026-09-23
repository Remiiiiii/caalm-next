import type { Metadata } from "next";
import { VolunteerShiftsClient } from "@/components/volunteers/VolunteerShiftsClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export const metadata: Metadata = {
	title: "Volunteer Shifts | CAALM",
	description: "Schedule volunteer shifts on the org calendar with capacity and waitlist.",
};

export default async function VolunteerShiftsPage() {
	await requirePagePermission(PERMISSIONS.VOLUNTEERS.VIEW);

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 flex items-center gap-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">Volunteer shifts</h1>
			</div>
			<p className="mb-6 max-w-4xl text-sm text-slate-600">
				Shifts are stored as calendar events with type{" "}
				<code className="text-xs">volunteer_shift</code> so contract deadlines
				and volunteer time share one calendar store.
			</p>
			<VolunteerShiftsClient />
		</div>
	);
}
