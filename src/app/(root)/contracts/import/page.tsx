import { ContractsImportClient } from "@/components/contracts/ContractsImportClient";
import { ImportPageShell } from "@/components/import/ImportPageShell";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function ContractsImportPage() {
	await requirePagePermission(PERMISSIONS.CONTRACTS.EDIT);
	return (
		<ImportPageShell
			title="Import contract metadata"
			description="Upload a CSV or Excel file to update vendor, dates, and other fields on contracts that already have a file in CAALM. This is not a PDF upload."
		>
			<ContractsImportClient />
		</ImportPageShell>
	);
}
