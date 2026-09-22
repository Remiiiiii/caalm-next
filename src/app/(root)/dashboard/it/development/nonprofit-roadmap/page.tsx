export const dynamic = "force-dynamic";

import { NonprofitRoadmapPage } from "@/components/it/roadmap/NonprofitRoadmapPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function NonprofitRoadmapRoutePage() {
	await requirePagePermission(PERMISSIONS.IT.VIEW_ROADMAP);
	return <NonprofitRoadmapPage />;
}
