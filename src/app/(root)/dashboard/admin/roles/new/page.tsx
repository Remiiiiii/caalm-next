export const dynamic = "force-dynamic";

import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";
import CreateRole from "./CreateRole";

export default async function CreateRolePage() {
	await requireDashboardPathAccess("/dashboard/admin/roles");
	return <CreateRole />;
}
