export const dynamic = "force-dynamic";

import CreateRole from "./CreateRole";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";

export default async function CreateRolePage() {
	await requireDashboardPathAccess("/dashboard/admin/roles");
	return <CreateRole />;
}
