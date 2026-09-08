export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import AdminDashboard from "../AdminDashboard";

export default async function AdminDashboardPage() {
	const user = await requireDashboardPathAccess("/dashboard/admin");
	return <AdminDashboard user={user} />;
}
