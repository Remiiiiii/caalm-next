import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { retryAttachment } from "@/lib/audit-lab/service";
import {
	assertInterviewEvidenceFile,
	CapEvidenceValidationError,
} from "@/lib/audit-upload/interview-evidence";
import { runAttachmentUpload } from "@/lib/audit-upload/run-attachment-upload";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Retries a failed attachment in place — same row, never a new entry. A scan
 * failure can retry without resending bytes (the file is already stored); an
 * upload failure needs the file resent, so `file` is optional multipart data.
 */
export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ attemptId: string; rowId: string }> },
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

	const { attemptId, rowId } = await context.params;
	await retryAttachment(resolved.actor, attemptId, rowId);

	try {
		const formData = await request.formData();
		const file = formData.get("file");
		if (file instanceof File) {
			assertInterviewEvidenceFile(file);
			const result = await runAttachmentUpload(rowId, file);
			return NextResponse.json({
				success: true,
				data: { rowId, status: result.status },
			});
		}
	} catch (error) {
		if (error instanceof CapEvidenceValidationError) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		console.error(
			"[SERVER] PATCH /api/audit-lab/practice/[attemptId]/attachments/[rowId]/retry:",
			error,
		);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"Could not retry that attachment.",
				),
			},
			{ status: 500 },
		);
	}

	return NextResponse.json({
		success: true,
		data: { rowId, status: "uploading" },
	});
}
