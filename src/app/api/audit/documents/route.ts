import { type NextRequest, NextResponse } from "next/server";
import { getAuditActor, AUDIT_DOCUMENT_READ_PERMISSIONS } from "@/lib/audit-upload/context";
import { buildAuditDocumentListItems } from "@/lib/audit-upload/upload-list-summaries";
import { listAuditDocuments, listFindings } from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [...AUDIT_DOCUMENT_READ_PERMISSIONS],
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const documents = await listAuditDocuments(actor.orgId);
	const findings = await listFindings({ orgId: actor.orgId, limit: 500 });
	const items = buildAuditDocumentListItems(documents, findings);
	return NextResponse.json({ success: true, data: { documents: items } });
}
