import { type NextRequest, NextResponse } from "next/server";
import {
	AUDIT_DOCUMENT_READ_PERMISSIONS,
	getAuditActor,
} from "@/lib/audit-upload/context";
import { generateFeedbackReport } from "@/lib/audit-upload/feedback";
import { createFeedback, getFeedbackForDocument } from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ documentId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [...AUDIT_DOCUMENT_READ_PERMISSIONS],
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const { documentId } = await context.params;
	const existing = await getFeedbackForDocument(actor.orgId, documentId);
	if (existing) {
		return NextResponse.json({ success: true, data: { feedback: existing } });
	}

	const report = await generateFeedbackReport(actor.orgId, documentId);
	const created = await createFeedback({
		orgId: actor.orgId,
		documentId,
		report,
	});
	return NextResponse.json({ success: true, data: { feedback: created } });
}
