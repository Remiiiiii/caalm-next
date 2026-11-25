export const dynamic = "force-dynamic";

import { TodoRoadmapPage } from "@/components/it/roadmap/TodoRoadmapPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function TodoRoadmapRoutePage() {
	await requirePagePermission(PERMISSIONS.IT.VIEW_ROADMAP);
	return <TodoRoadmapPage />;
}
