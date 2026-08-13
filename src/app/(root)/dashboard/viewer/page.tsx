export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import ExecutiveDashboard from "../ExecutiveDashboard";

export default async function ViewerDashboardPage() {
	const currentUser = await requireDashboardPathAccess("/dashboard/viewer");

	return <ExecutiveDashboard user={currentUser} />;
}
