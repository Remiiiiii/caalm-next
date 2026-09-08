export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import HRDashboard from "../HRDashboard";

export default async function HRDashboardPage() {
	const currentUser = await requireDashboardPathAccess("/dashboard/hr");
	return <HRDashboard user={currentUser} />;
}
