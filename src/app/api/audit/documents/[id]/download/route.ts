import { type NextRequest, NextResponse } from "next/server";
import {
	AUDIT_DOCUMENT_READ_PERMISSIONS,
	getAuditActor,
} from "@/lib/audit-upload/context";
import { loadStoredFile } from "@/lib/audit-upload/run-pipeline";
import { getAuditDocument } from "@/lib/audit-upload/store";
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

	const file = await loadStoredFile(document.storageFileId);
	return new NextResponse(new Uint8Array(file.buffer), {
		headers: {
			"Content-Type": file.type || "application/octet-stream",
			"Content-Disposition": `attachment; filename="${document.fileName.replace(/"/g, "")}"`,
		},
	});
}
