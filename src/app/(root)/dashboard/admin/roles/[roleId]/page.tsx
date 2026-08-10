export const dynamic = "force-dynamic";

import RoleDetail from "./RoleDetail";
import { requireDashboardPathAccess } from "@/lib/rbac/page-guards";

export default async function RoleDetailPage({
	params,
}: {
	params: Promise<{ roleId: string }>;
}) {
	await requireDashboardPathAccess("/dashboard/admin/roles");
	const { roleId } = await params;
	return <RoleDetail roleId={roleId} />;
}
