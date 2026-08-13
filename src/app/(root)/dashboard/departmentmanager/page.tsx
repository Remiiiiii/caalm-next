export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import DepartmentManagerDashboard from "../DepartmentManagerDashboard";

export default async function DepartmentManagerDashboardPage() {
	const currentUser = await requireDashboardPathAccess(
		"/dashboard/departmentmanager",
	);

	return <DepartmentManagerDashboard user={currentUser} />;
}
