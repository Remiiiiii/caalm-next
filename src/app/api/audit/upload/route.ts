import { after } from "next/server";
import { type NextRequest, NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditUploadEvent } from "@/lib/audit-upload/audit-log";
import { hashAuditContent } from "@/lib/audit-upload/content-hash";
import { getAuditActor } from "@/lib/audit-upload/context";
import {
	assertAuditUploadFile,
	AuditUploadValidationError,
} from "@/lib/audit-upload/extract-document-text";
import { runAuditUploadPipeline } from "@/lib/audit-upload/run-pipeline";
import { createAuditDocument, findDocumentByHash } from "@/lib/audit-upload/store";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.UPLOAD,
		requireOrg: true,
	});
	if (denied) return denied;

	const actor = await getAuditActor();
	if (actor.error) return actor.error;

	try {
		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File)) {
			return NextResponse.json({ error: "A file is required" }, { status: 400 });
		}

		assertAuditUploadFile(file);
		const bytes = Buffer.from(await file.arrayBuffer());
		const contentHash = hashAuditContent(bytes);

		const existing = await findDocumentByHash(actor.orgId, contentHash);
		if (existing) {
			return NextResponse.json({
				success: true,
				duplicate: true,
				data: { document: existing },
			});
		}

		const { storage } = await createAdminClient();
		const uploaded = await storage.createFile({
			bucketId: appwriteConfig.auditDocumentsBucketId,
			fileId: ID.unique(),
			file: InputFile.fromBuffer(bytes, file.name),
		});

		const document = await createAuditDocument({
			orgId: actor.orgId,
			uploadedBy: actor.user.$id,
			fileName: file.name,
			mimeType: file.type || "application/octet-stream",
			fileSize: file.size,
			storageFileId: uploaded.$id,
			contentHash,
			status: "uploaded",
			processingLog: [
				{
					at: new Date().toISOString(),
					stage: "upload",
					status: "complete",
				},
			],
			summary: null,
			metadata: null,
			errorMessage: null,
			deletedAt: null,
		});

		await logAuditUploadEvent({
			user: actor.user,
			orgId: actor.orgId,
			action: "create",
			summary: `Uploaded audit document ${file.name}`,
			targetId: document.$id,
			targetLabel: file.name,
		});

		after(() =>
			runAuditUploadPipeline(document.$id, actor.orgId, { reconcile: true }).catch(
				(error) => {
					console.error("[SERVER] runAuditUploadPipeline:", error);
				},
			),
		);

		return NextResponse.json({ success: true, data: { document } });
	} catch (error) {
		if (error instanceof AuditUploadValidationError) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		console.error("[SERVER] POST /api/audit/upload:", error);
		return NextResponse.json({ error: "Upload failed" }, { status: 500 });
	}
}
