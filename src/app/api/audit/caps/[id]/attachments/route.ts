import { type NextRequest, NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import {
	CAP_EVIDENCE_MAX_FILES,
	CapEvidenceValidationError,
	assertCapEvidenceFile,
	normalizeEvidenceList,
} from "@/lib/audit-upload/cap-evidence";
import { getAuditActor } from "@/lib/audit-upload/context";
import { getCap, updateCap } from "@/lib/audit-upload/store";
import type { AuditCapEvidenceAttachment } from "@/lib/audit-upload/types";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Upload a screenshot or document as CAP close evidence.
 * Permission: audit.manage_caps
 */
export async function POST(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const denied = await requirePermission(request, {
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

	const { id } = await context.params;
	const cap = await getCap(actor.orgId, id);
	if (!cap) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File)) {
			return NextResponse.json({ error: "A file is required" }, { status: 400 });
		}

		assertCapEvidenceFile(file);
		const existing = normalizeEvidenceList(cap.evidenceAttachments);
		if (existing.length >= CAP_EVIDENCE_MAX_FILES) {
			return NextResponse.json(
				{ error: `You can attach up to ${CAP_EVIDENCE_MAX_FILES} files.` },
				{ status: 400 },
			);
		}

		const bytes = Buffer.from(await file.arrayBuffer());
		const { storage } = await createAdminClient();
		const uploaded = await storage.createFile({
			bucketId: appwriteConfig.auditDocumentsBucketId,
			fileId: ID.unique(),
			file: InputFile.fromBuffer(bytes, file.name),
		});

		const attachment: AuditCapEvidenceAttachment = {
			fileId: uploaded.$id,
			fileName: file.name,
			mimeType: file.type || "application/octet-stream",
			fileSize: file.size,
			uploadedAt: new Date().toISOString(),
		};

		const updated = await updateCap(id, {
			evidenceAttachments: [...existing, attachment],
		});

		await logAuditUploadEvent({
			user: actor.user,
			orgId: actor.orgId,
			action: "update",
			summary: `Attached evidence ${file.name} to corrective action ${cap.title}`,
			targetId: id,
			targetLabel: cap.title,
			targetType: "audit_cap",
		});

		return NextResponse.json({
			success: true,
			data: { cap: updated, attachment },
		});
	} catch (error) {
		if (error instanceof CapEvidenceValidationError) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		console.error("[SERVER] POST /api/audit/caps/[id]/attachments:", error);
		const detail =
			error instanceof Error && error.message
				? error.message
				: "Could not attach that file.";
		const status =
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			Number((error as { code?: number }).code) === 400
				? 400
				: 500;
		return NextResponse.json({ error: detail }, { status });
	}
}
