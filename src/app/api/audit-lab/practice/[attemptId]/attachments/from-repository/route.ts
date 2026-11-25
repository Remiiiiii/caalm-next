import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { startAttachment } from "@/lib/audit-lab/service";
import {
	assertInterviewEvidenceFile,
	CapEvidenceValidationError,
} from "@/lib/audit-upload/interview-evidence";
import {
	loadRepositoryFileForOrg,
	RepositoryFileAccessError,
} from "@/lib/audit-upload/repository-file";
import { runAttachmentUpload } from "@/lib/audit-upload/run-attachment-upload";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Attaches a file already in the org's document repository to a live
 * interview — the "send to interview" action on /documents (and every
 * other /[type] file route) posts here instead of through the drag/drop
 * upload route. Copies the file's current bytes into a fresh attachment
 * row rather than linking the repository row live, so the interview's
 * evidence stays a frozen version even if the source file is later
 * edited or removed.
 */
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
		const body = (await request.json().catch(() => ({}))) as {
			fileId?: string;
			questionId?: string;
			replyToText?: string;
		};
		const fileId = String(body.fileId ?? "").trim();
		if (!fileId) {
			return NextResponse.json(
				{ error: "A file is required" },
				{ status: 400 },
			);
		}

		const { buffer, name, type } = await loadRepositoryFileForOrg(
			fileId,
			resolved.actor.orgId,
		);
		const file = new File([new Uint8Array(buffer)], name, { type });
		assertInterviewEvidenceFile(file);

		const started = await startAttachment(resolved.actor, attemptId, {
			fileName: file.name,
			mimeType: file.type || "application/octet-stream",
			fileSize: file.size,
			source: "repository_pick",
			questionId:
				typeof body.questionId === "string" ? body.questionId : undefined,
			replyToText:
				typeof body.replyToText === "string" ? body.replyToText : undefined,
		});
		if ("error" in started) {
			return NextResponse.json({ error: started.error }, { status: 404 });
		}

		// Same pattern as the drag/drop upload route: the row is already
		// visible to the client (status "uploading") before this runs, so a
		// scan/storage failure lands on this same row as "failed" instead of
		// silently dropping the attachment.
		const result = await runAttachmentUpload(started.row.$id, file);
		return NextResponse.json({
			success: true,
			data: { rowId: started.row.$id, status: result.status },
		});
	} catch (error) {
		if (error instanceof RepositoryFileAccessError) {
			return NextResponse.json({ error: error.message }, { status: 404 });
		}
		if (error instanceof CapEvidenceValidationError) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		console.error(
			"[SERVER] POST /api/audit-lab/practice/[attemptId]/attachments/from-repository:",
			error,
		);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't attach that file. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
