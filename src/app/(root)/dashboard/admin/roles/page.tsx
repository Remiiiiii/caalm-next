export const dynamic = "force-dynamic";

import RolesManagement from "./RolesManagement";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";

export default async function RolesManagementPage() {
	await requireDashboardPathAccess("/dashboard/admin/roles");
	return <RolesManagement />;
}
