export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import RolesManagement from "./RolesManagement";

export default async function RolesManagementPage() {
	await requireDashboardPathAccess("/dashboard/admin/roles");
	return <RolesManagement />;
}
