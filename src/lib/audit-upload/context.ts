import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export const AUDIT_DOCUMENT_READ_PERMISSIONS = [
	PERMISSIONS.AUDIT.DOCUMENTS_VIEW,
	PERMISSIONS.AUDIT.UPLOAD,
	PERMISSIONS.AUDIT.MANAGE_FINDINGS,
	PERMISSIONS.AUDIT.MANAGE_CAPS,
	PERMISSIONS.AUDIT.DELETE,
] as const;

export async function requireAuditUploadPermission(
	request: NextRequest,
	permission:
		| (typeof PERMISSIONS.AUDIT)[keyof typeof PERMISSIONS.AUDIT]
		| readonly string[],
) {
	return requirePermission(request, {
		permission: permission as never,
		requireOrg: true,
	});
}

export async function getAuditActor() {
	const user = await getCurrentUser();
	if (!user) {
		return {
			error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
		};
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return {
			error: NextResponse.json(
				{ error: "No organization on this account" },
				{ status: 400 },
			),
		};
	}
	return {
		user,
		orgId: org.orgId,
		error: null as NextResponse | null,
	};
}
