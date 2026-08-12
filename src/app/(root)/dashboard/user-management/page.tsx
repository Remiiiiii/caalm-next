export const dynamic = "force-dynamic";

import UserManagement from "../UserManagement";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";

export default async function UserManagementPage() {
	await requireDashboardPathAccess("/dashboard/user-management");
	return <UserManagement />;
}
