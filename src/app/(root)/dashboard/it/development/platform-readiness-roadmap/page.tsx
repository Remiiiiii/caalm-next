export const dynamic = "force-dynamic";

import { PlatformReadinessRoadmapPage } from "@/components/it/roadmap/PlatformReadinessRoadmapPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function PlatformReadinessRoadmapRoutePage() {
	await requirePagePermission(PERMISSIONS.IT.VIEW_ROADMAP);
	return <PlatformReadinessRoadmapPage />;
}
