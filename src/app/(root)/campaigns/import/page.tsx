import { CampaignsImportClient } from "@/components/campaigns/CampaignsImportClient";
import { ImportPageShell } from "@/components/import/ImportPageShell";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function CampaignsImportPage() {
	await requirePagePermission(PERMISSIONS.GIFTS.CREATE);
	return (
		<ImportPageShell
			title="Import campaigns"
			description="Upload a CSV or Excel file of campaign names and optional goals. Existing names are skipped."
		>
			<CampaignsImportClient />
		</ImportPageShell>
	);
}
