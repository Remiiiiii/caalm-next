export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import AdminDashboard from "../AdminDashboard";

export default async function OrganizationAdminDashboardPage() {
	const currentUser = await requireDashboardPathAccess(
		"/dashboard/organizationadmin",
	);

	return <AdminDashboard user={currentUser} />;
}
