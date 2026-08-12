export const dynamic = "force-dynamic";

import AdminDashboard from "../AdminDashboard";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";

export default async function AdminDashboardPage() {
	const user = await requireDashboardPathAccess("/dashboard/admin");
	return <AdminDashboard user={user} />;
}
