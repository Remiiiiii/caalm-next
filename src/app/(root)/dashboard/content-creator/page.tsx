export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import ContentCreatorDashboard from "./ContentCreatorDashboard";

export default async function ContentCreatorDashboardPage() {
	const currentUser = await requireDashboardPathAccess(
		"/dashboard/content-creator",
	);

	return <ContentCreatorDashboard user={currentUser} />;
}
