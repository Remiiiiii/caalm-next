export const dynamic = "force-dynamic";

import { ProductionToolsRoadmapPage } from "@/components/it/roadmap/ProductionToolsRoadmapPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function ProductionToolsRoadmapRoutePage() {
	await requirePagePermission(PERMISSIONS.IT.VIEW_ROADMAP);
	return <ProductionToolsRoadmapPage />;
}
