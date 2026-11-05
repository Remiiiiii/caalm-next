import { type NextRequest, NextResponse } from "next/server";
import {
	AUDIT_DOCUMENT_READ_PERMISSIONS,
	getAuditActor,
} from "@/lib/audit-upload/context";
import { generateFeedbackReport } from "@/lib/audit-upload/feedback";
import { createFeedback, getAuditDocument } from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

/** Recomputes the Report tab's analysis from current findings/caps — no re-extraction. */
export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [...AUDIT_DOCUMENT_READ_PERMISSIONS],
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	const { id } = await context.params;
	const document = await getAuditDocument(actor.orgId, id);
	if (!document) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const report = await generateFeedbackReport(actor.orgId, id);
	const feedback = await createFeedback({
		orgId: actor.orgId,
		documentId: id,
		report,
	});

	return NextResponse.json({ success: true, data: { feedback } });
}
