import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import {
	AUDIT_DOCUMENT_READ_PERMISSIONS,
	getAuditActor,
} from "@/lib/audit-upload/context";
import {
	getAuditDocument,
	listCaps,
	listFindings,
	softDeleteDocumentChildren,
	updateAuditDocument,
} from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
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

	const [findings, caps] = await Promise.all([
		listFindings({ orgId: actor.orgId, documentId: id, limit: 200 }),
		listCaps({ orgId: actor.orgId, documentId: id, limit: 200 }),
	]);

	return NextResponse.json({
		success: true,
		data: { document, findings, caps },
	});
}

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.DELETE,
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

	await softDeleteDocumentChildren(actor.orgId, id);
	await updateAuditDocument(id, { deletedAt: new Date().toISOString() });
	await logAuditUploadEvent({
		user: actor.user,
		orgId: actor.orgId,
		action: "delete",
		summary: `Soft-deleted audit document ${document.fileName}`,
		targetId: id,
		targetLabel: document.fileName,
	});

	return NextResponse.json({ success: true });
}
