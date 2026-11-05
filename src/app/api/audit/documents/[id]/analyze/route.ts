import { after } from "next/server";
import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import { getAuditActor } from "@/lib/audit-upload/context";
import { runAuditUploadPipeline } from "@/lib/audit-upload/run-pipeline";
import { getAuditDocument, updateAuditDocument } from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.UPLOAD,
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

	await updateAuditDocument(id, {
		status: "uploaded",
		errorMessage: null,
	});
	await logAuditUploadEvent({
		user: actor.user,
		orgId: actor.orgId,
		action: "update",
		summary: `Re-ran analysis for ${document.fileName}`,
		targetId: id,
		targetLabel: document.fileName,
	});

	after(() =>
		runAuditUploadPipeline(id, actor.orgId, { reconcile: true }).catch((error) => {
			console.error("[SERVER] runAuditUploadPipeline:", error);
		}),
	);

	return NextResponse.json({ success: true, data: { documentId: id } });
}
