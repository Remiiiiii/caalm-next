import { type NextRequest, NextResponse } from "next/server";
import {
	AUDIT_DOCUMENT_READ_PERMISSIONS,
	getAuditActor,
} from "@/lib/audit-upload/context";
import { buildAuditTrends } from "@/lib/audit-upload/trends";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [...AUDIT_DOCUMENT_READ_PERMISSIONS],
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const trends = await buildAuditTrends(actor.orgId);
	return NextResponse.json({ success: true, data: { trends } });
}
