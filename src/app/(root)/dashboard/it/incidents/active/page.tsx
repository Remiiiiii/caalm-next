export const dynamic = "force-dynamic";

import { AlertTriangle } from "lucide-react";
import { ActiveIncidentsClient } from "@/components/it/ActiveIncidentsClient";
import { ITPageShell } from "@/components/it/ITPageShell";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import { getUserPermissions } from "@/lib/rbac/permissions";

export default async function ActiveIncidentsPage() {
	const user = await requirePagePermission(PERMISSIONS.IT.VIEW_INCIDENTS);
	const permissions = await getUserPermissions(user.$id);
	const canManage = permissions.includes(PERMISSIONS.IT.MANAGE_INCIDENTS);

	return (
		<ITPageShell
			title="Active incidents"
			subtitle="Pages and sections that failed to load for users. Review the captured screen, then take the steps to resolve."
			icon={AlertTriangle}
		>
			<ActiveIncidentsClient canManage={canManage} currentUserId={user.$id} />
		</ITPageShell>
	);
}
