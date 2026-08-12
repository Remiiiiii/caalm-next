export const dynamic = "force-dynamic";

import ITDashboard from "@/components/ITDashboard";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";

export default async function ITDashboardPage() {
	await requireDashboardPathAccess("/dashboard/it");
	return <ITDashboard />;
}
