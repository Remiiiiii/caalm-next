import { ImportPageShell } from "@/components/import/ImportPageShell";
import { VolunteerShiftsImportClient } from "@/components/volunteers/VolunteerShiftsImportClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function VolunteerShiftsImportPage() {
	await requirePagePermission(PERMISSIONS.VOLUNTEERS.MANAGE);
	return (
		<ImportPageShell
			title="Import volunteer shifts"
			description="Upload a CSV or Excel file of shift titles, dates, and capacity. CAALM stores them as calendar events."
		>
			<VolunteerShiftsImportClient />
		</ImportPageShell>
	);
}
