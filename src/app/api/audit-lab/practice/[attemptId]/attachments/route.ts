import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { startAttachment } from "@/lib/audit-lab/service";
import type { AttachmentSource } from "@/lib/audit-lab/types";
import {
	assertInterviewEvidenceFile,
	CapEvidenceValidationError,
} from "@/lib/audit-upload/interview-evidence";
import { runAttachmentUpload } from "@/lib/audit-upload/run-attachment-upload";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

const ATTACHMENT_SOURCES: AttachmentSource[] = [
	"stage_drop",
	"rubric_item",
	"floating_widget",
];

/** Upload an evidence attachment during a live practice interview (stage drop, rubric-item control, or floating widget — all post here). */
export async function POST(
	request: NextRequest,
	context: { params: Promise<{ attemptId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.RUN_PRACTICE,
	});
	if (denied) return denied;

	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	const { attemptId } = await context.params;

	try {
		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File)) {
			return NextResponse.json(
				{ error: "A file is required" },
				{ status: 400 },
			);
		}
		const source = String(formData.get("source") || "");
		if (!ATTACHMENT_SOURCES.includes(source as AttachmentSource)) {
			return NextResponse.json({ error: "Invalid source" }, { status: 400 });
		}
		const questionId = formData.get("questionId");
		const replyToText = formData.get("replyToText");

		assertInterviewEvidenceFile(file);

		const started = await startAttachment(resolved.actor, attemptId, {
			fileName: file.name,
			mimeType: file.type || "application/octet-stream",
			fileSize: file.size,
			source: source as AttachmentSource,
			questionId: typeof questionId === "string" ? questionId : undefined,
			replyToText: typeof replyToText === "string" ? replyToText : undefined,
		});
		if ("error" in started) {
			return NextResponse.json({ error: started.error }, { status: 404 });
		}

		// The row already exists (status "uploading", visible to the client via
		// realtime) before the upload/scan below runs, so a failure here never
		// silently drops the entry — it lands on this same row as "failed".
		const result = await runAttachmentUpload(started.row.$id, file);
		return NextResponse.json({
			success: true,
			data: { rowId: started.row.$id, status: result.status },
		});
	} catch (error) {
		if (error instanceof CapEvidenceValidationError) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		console.error(
			"[SERVER] POST /api/audit-lab/practice/[attemptId]/attachments:",
			error,
		);
		return NextResponse.json(
			{ error: toUserFacingErrorMessage(error, "Could not attach that file.") },
			{ status: 500 },
		);
	}
}
