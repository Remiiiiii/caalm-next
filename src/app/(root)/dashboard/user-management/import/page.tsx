import { ImportPageShell } from "@/components/import/ImportPageShell";
import { UsersImportClient } from "@/components/users/UsersImportClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function UsersImportPage() {
	await requirePagePermission(PERMISSIONS.USERS.INVITE);
	return (
		<ImportPageShell
			title="Import user invites"
			description="Upload a CSV or Excel file of names, emails, and roles. CAALM sends invitations one row at a time and stops if billing seats run out."
		>
			<UsersImportClient />
		</ImportPageShell>
	);
}
