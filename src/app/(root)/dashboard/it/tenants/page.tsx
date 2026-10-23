export const dynamic = "force-dynamic";

import { ITPageShell } from "@/components/it/ITPageShell";
import { ITTenantsFleetClient } from "@/components/it/ITTenantsFleetClient";
import { requireITHubFleetPage } from "@/lib/it/require-it-hub-org";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";

export default async function ITTenantsPage() {
	const user = await requireDashboardPathAccess("/dashboard/it");
	await requireITHubFleetPage(user.$id);

	return (
		<ITPageShell
			title="Tenants"
			subtitle="Fleet view of each organization — seats, storage, tickets, and deletion status"
		>
			<ITTenantsFleetClient />
		</ITPageShell>
	);
}
