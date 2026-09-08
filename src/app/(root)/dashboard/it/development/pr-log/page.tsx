export const dynamic = "force-dynamic";

import { PrLogPage } from "@/components/it/pr-log/PrLogPage";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function PrLogRoutePage() {
	await requirePagePermission(PERMISSIONS.IT.VIEW_ROADMAP);
	return <PrLogPage />;
}
