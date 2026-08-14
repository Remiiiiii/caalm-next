export const dynamic = "force-dynamic";

import HRDashboard from "../HRDashboard";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";

export default async function HRDashboardPage() {
	const currentUser = await requireDashboardPathAccess("/dashboard/hr");
	return <HRDashboard user={currentUser} />;
}
