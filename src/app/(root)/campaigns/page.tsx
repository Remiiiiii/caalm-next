import { CampaignsPageClient } from "@/components/campaigns/CampaignsPageClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function CampaignsPage() {
	await requirePagePermission(PERMISSIONS.GIFTS.VIEW);
	return <CampaignsPageClient />;
}
