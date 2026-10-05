export const dynamic = "force-dynamic";

import { Building2 } from "lucide-react";
import { Suspense } from "react";
import { ITPageShell } from "@/components/it/ITPageShell";
import { ITTenantHubClient } from "@/components/it/ITTenantHubClient";
import { LoadingSpinner } from "@/components/ui/loading";
import { requireITHubPageOrg } from "@/lib/it/require-it-hub-org";
import { getOrganization } from "@/lib/rbac/organizations";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";

export default async function ITTenantDetailPage({
	params,
}: {
	params: Promise<{ orgId: string }>;
}) {
	const { orgId } = await params;
	const user = await requireDashboardPathAccess("/dashboard/it");
	await requireITHubPageOrg(user.$id, orgId);
	const org = await getOrganization(orgId);

	return (
		<ITPageShell
			title={org?.name || "Tenant"}
			subtitle="Organization IT hub — live org data metrics"
			icon={Building2}
		>
			<Suspense
				fallback={
					<div className="flex justify-center py-12">
						<LoadingSpinner size="sm" label="Loading tenant…" />
					</div>
				}
			>
				<ITTenantHubClient orgId={orgId} />
			</Suspense>
		</ITPageShell>
	);
}
