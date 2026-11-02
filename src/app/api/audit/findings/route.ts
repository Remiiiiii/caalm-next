import { type NextRequest, NextResponse } from "next/server";
import {
	AUDIT_DOCUMENT_READ_PERMISSIONS,
	getAuditActor,
} from "@/lib/audit-upload/context";
import { listFindings } from "@/lib/audit-upload/store";
import type { AuditFindingStatus } from "@/lib/audit-upload/types";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [...AUDIT_DOCUMENT_READ_PERMISSIONS],
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const documentId = request.nextUrl.searchParams.get("documentId") || undefined;
	const status = request.nextUrl.searchParams.get("status") as
		| AuditFindingStatus
		| null;

	const findings = await listFindings({
		orgId: actor.orgId,
		documentId,
		status: status || undefined,
	});

	return NextResponse.json({ success: true, data: { findings } });
}
