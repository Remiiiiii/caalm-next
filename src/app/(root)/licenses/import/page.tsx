import { ImportPageShell } from "@/components/import/ImportPageShell";
import { LicensesImportClient } from "@/components/licenses/LicensesImportClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function LicensesImportPage() {
	await requirePagePermission(PERMISSIONS.LICENSES.CREATE);
	return (
		<ImportPageShell
			title="Import licenses"
			description="Upload a CSV or Excel inventory. CAALM creates license records for review; it does not attach certificate files."
		>
			<LicensesImportClient />
		</ImportPageShell>
	);
}
