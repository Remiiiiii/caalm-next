import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import { normalizeEvidenceList } from "@/lib/audit-upload/cap-evidence";
import {
	AUDIT_DOCUMENT_READ_PERMISSIONS,
	getAuditActor,
} from "@/lib/audit-upload/context";
import { getCap, updateCap } from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Stream a CAP evidence file for inline preview or download.
 * Permission: any audit document read permission.
 */
export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string; fileId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [...AUDIT_DOCUMENT_READ_PERMISSIONS],
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;
	if (!actor.orgId) {
		return NextResponse.json(
			{ error: "No organization on this account" },
			{ status: 400 },
		);
	}

	const { id, fileId } = await context.params;
	const cap = await getCap(actor.orgId, id);
	if (!cap) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const attachment = normalizeEvidenceList(cap.evidenceAttachments).find(
		(item) => item.fileId === fileId,
	);
	if (!attachment) {
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}

	try {
		const { storage } = await createAdminClient();
		const bucketId = appwriteConfig.auditDocumentsBucketId;
		const meta = await storage.getFile({ bucketId, fileId });
		const buffer = Buffer.from(
			await storage.getFileDownload({ bucketId, fileId }),
		);

		const download = request.nextUrl.searchParams.get("download") === "1";
		const mimeType =
			attachment.mimeType || meta.mimeType || "application/octet-stream";
		const safeName = (attachment.fileName || meta.name).replace(
			/[^\w.\- ]/g,
			"_",
		);

		return new NextResponse(new Uint8Array(buffer), {
			status: 200,
			headers: {
				"Content-Type": mimeType,
				"Content-Length": String(buffer.length),
				"Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
				"Cache-Control": "private, max-age=300",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		console.error(
			"[SERVER] GET /api/audit/caps/[id]/attachments/[fileId]:",
			error,
		);
		return NextResponse.json({ error: "Could not load file" }, { status: 500 });
	}
}

/**
 * Remove a CAP evidence attachment.
 * Permission: audit.manage_caps
 */
export async function DELETE(
	_request: NextRequest,
	context: { params: Promise<{ id: string; fileId: string }> },
) {
	const denied = await requirePermission(_request, {
		permission: PERMISSIONS.AUDIT.MANAGE_CAPS,
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;
	if (!actor.orgId || !actor.user) {
		return NextResponse.json(
			{ error: "No organization on this account" },
			{ status: 400 },
		);
	}

	const { id, fileId } = await context.params;
	const cap = await getCap(actor.orgId, id);
	if (!cap) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const existing = normalizeEvidenceList(cap.evidenceAttachments);
	const attachment = existing.find((item) => item.fileId === fileId);
	if (!attachment) {
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}

	try {
		const next = existing.filter((item) => item.fileId !== fileId);
		const updated = await updateCap(id, { evidenceAttachments: next });

		try {
			const { storage } = await createAdminClient();
			await storage.deleteFile({
				bucketId: appwriteConfig.auditDocumentsBucketId,
				fileId,
			});
		} catch (storageError) {
			console.error(
				"[SERVER] DELETE CAP evidence storage cleanup:",
				storageError,
			);
		}

		await logAuditUploadEvent({
			user: actor.user,
			orgId: actor.orgId,
			action: "update",
			summary: `Removed evidence ${attachment.fileName} from corrective action ${cap.title}`,
			targetId: id,
			targetLabel: cap.title,
			targetType: "audit_cap",
		});

		return NextResponse.json({
			success: true,
			data: { cap: updated },
		});
	} catch (error) {
		console.error(
			"[SERVER] DELETE /api/audit/caps/[id]/attachments/[fileId]:",
			error,
		);
		return NextResponse.json({ error: "Could not remove file" }, { status: 500 });
	}
}
