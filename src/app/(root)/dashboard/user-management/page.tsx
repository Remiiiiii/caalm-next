export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import UserManagement from "../UserManagement";

export default async function UserManagementPage() {
	await requireDashboardPathAccess("/dashboard/user-management");
	return <UserManagement />;
}
