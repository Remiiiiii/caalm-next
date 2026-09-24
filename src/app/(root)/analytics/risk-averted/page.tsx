export const dynamic = "force-dynamic";

import { RiskAvertedDetailPage } from "@/components/dashboard/RiskAvertedDetailPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function RiskAvertedPage() {
	await requirePagePermission(PERMISSIONS.CONTRACTS.VIEW);
	return <RiskAvertedDetailPage />;
}
