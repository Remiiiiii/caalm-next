import { PERMISSIONS } from "@/constants/permissions";
import type { LabCapabilities } from "@/lib/audit-lab/access";
import { resolveLabCapabilities } from "@/lib/audit-lab/access";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";

export type LabServerContext = {
	userId: string;
	orgId: string;
	capabilities: LabCapabilities;
	permissions: string[];
};

export async function getLabServerContext(): Promise<LabServerContext> {
	const user = await requirePagePermission(PERMISSIONS.AUDIT_LAB.VIEW);
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		throw new Error("No organization");
	}
	const permissions = await getUserPermissions(user.$id, org.orgId);
	const capabilities = resolveLabCapabilities({
		permissions,
		departmentNames: [],
	});
	return {
		userId: user.$id,
		orgId: org.orgId,
		capabilities,
		permissions,
	};
}