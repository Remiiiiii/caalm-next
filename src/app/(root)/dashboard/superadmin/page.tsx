export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import ExecutiveDashboard from "../ExecutiveDashboard";

export default async function SuperAdminDashboardPage() {
	const currentUser = await requireDashboardPathAccess("/dashboard/superadmin");

	return <ExecutiveDashboard user={currentUser} />;
}
