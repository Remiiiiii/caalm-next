import { ObligationsImportClient } from "@/components/funding/ObligationsImportClient";
import { ImportPageShell } from "@/components/import/ImportPageShell";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function ObligationsImportPage() {
	await requirePagePermission(PERMISSIONS.FUNDING.MANAGE);
	return (
		<ImportPageShell
			title="Import obligations"
			description="Upload a CSV or Excel file of reporting and renewal tasks. Rows attach to contracts already in this organization."
		>
			<ObligationsImportClient />
		</ImportPageShell>
	);
}
