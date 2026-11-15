export const dynamic = "force-dynamic";

import { AuditLabClient } from "@/components/audit-lab/AuditLabClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePagePermission } from "@/lib/rbac/page-guards";
import {
	getUserDefaultOrganization,
	getUserPermissions,
} from "@/lib/rbac/permissions";

export default async function AuditLabPage() {
	const user = await requirePagePermission(PERMISSIONS.AUDIT_LAB.VIEW);
	const org = await getUserDefaultOrganization(user.$id);
	const permissions = org?.orgId
		? await getUserPermissions(user.$id, org.orgId)
		: [];
	const canManageSessions = permissions.includes(
		PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS,
	);
	const canManageEvidence = permissions.includes(
		PERMISSIONS.AUDIT_LAB.MANAGE_EVIDENCE,
	);
	const canPractice = permissions.includes(PERMISSIONS.AUDIT_LAB.RUN_PRACTICE);

	return (
		<AuditLabClient
			canManageSessions={canManageSessions}
			canManageEvidence={canManageEvidence}
			canPractice={canPractice}
		/>
	);
}
