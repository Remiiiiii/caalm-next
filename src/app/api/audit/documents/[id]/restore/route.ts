import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import { getAuditActor } from "@/lib/audit-upload/context";
import {
	getAuditDocument,
	updateAuditDocument,
} from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Soft-restore an uploaded audit document (clears deletedAt).
 * Permission: audit.delete (PERMISSIONS.AUDIT.DELETE)
 *
 * v1: restores the upload into the active list only. Findings and CAPs that
 * were closed on delete stay closed — reopen those separately if needed.
 */
export async function POST(
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
	if (!id) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const orgId = actor.orgId;
	if (!orgId) {
		return NextResponse.json(
			{ error: "No organization on this account" },
			{ status: 400 },
		);
	}

	const document = await getAuditDocument(orgId, id, {
		includeDeleted: true,
	});
	if (!document) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}
	if (!document.deletedAt) {
		return NextResponse.json(
			{ error: "This upload is already active" },
			{ status: 409 },
		);
	}

	await updateAuditDocument(id, { deletedAt: null });
	await logAuditUploadEvent({
		user: actor.user,
		orgId,
		action: "restore",
		summary: `Restored audit document ${document.fileName}`,
		targetId: id,
		targetLabel: document.fileName,
	});

	return NextResponse.json({ success: true });
}
