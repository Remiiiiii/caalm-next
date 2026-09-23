import { PERMISSIONS } from "@/constants/permissions";
import { ConstituentsPageClient } from "@/components/constituents/ConstituentsPageClient";
import { requirePagePermission } from "@/lib/rbac/page-guards";

export default async function ConstituentsPage() {
	await requirePagePermission(PERMISSIONS.CONSTITUENTS.VIEW);
	return <ConstituentsPageClient />;
}
