import { ImportPageShell } from "@/components/import/ImportPageShell";
import { GiftsImportClient } from "@/components/gifts/GiftsImportClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function GiftsImportPage() {
	await requirePagePermission(PERMISSIONS.GIFTS.CREATE);
	return (
		<ImportPageShell
			title="Import gifts"
			description="Upload a CSV or Excel file of historical gifts for people already in CAALM. The file stays in your browser until you preview and commit."
		>
			<GiftsImportClient />
		</ImportPageShell>
	);
}
