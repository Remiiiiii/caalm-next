import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { resolveLabCapabilities } from "@/lib/audit-lab/access";
import { getAttempt } from "@/lib/audit-lab/repository";
import { deleteVoicePracticeRecording } from "@/lib/audit-lab/service";
import { getPracticeRecordingBytes } from "@/lib/audit-lab/voice/recordings";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { getUserPermissions } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ attemptId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: [
			PERMISSIONS.AUDIT_LAB.VIEW,
			PERMISSIONS.AUDIT_LAB.RUN_PRACTICE,
			PERMISSIONS.AUDIT_LAB.SCORE_PRACTICE,
			PERMISSIONS.AUDIT_LAB.MANAGE_PRACTICE_MEDIA,
		],
	});
	if (denied) return denied;

	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	try {
		const { attemptId } = await context.params;
		const attempt = await getAttempt(resolved.actor.orgId, attemptId);
		if (!attempt || !attempt.recordingFileId) {
			return NextResponse.json(
				{ error: "Recording not found." },
				{ status: 404 },
			);
		}

		const permissions = await getUserPermissions(resolved.actor.userId);
		const caps = resolveLabCapabilities({ permissions });
		const isOwner =
			attempt.intervieweeUserId === resolved.actor.userId ||
			attempt.createdByUserId === resolved.actor.userId;
		const allowed =
			isOwner ||
			caps.canRunPractice ||
			caps.canScorePractice ||
			caps.canManagePracticeMedia;
		if (!allowed) {
			return NextResponse.json(
				{ error: "You do not have access to this recording." },
				{ status: 403 },
			);
		}

		const file = await getPracticeRecordingBytes(attempt.recordingFileId);
		return new NextResponse(file.body, {
			status: 200,
			headers: {
				"Content-Type": file.mimeType,
				"Content-Disposition": `inline; filename="${file.filename}"`,
				"Cache-Control": "private, no-store",
			},
		});
	} catch (error) {
		console.error("[SERVER] GET /api/audit-lab/practice/[attemptId]/recording:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"Could not load that recording. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ attemptId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.MANAGE_PRACTICE_MEDIA,
	});
	if (denied) return denied;

	const resolved = await resolveAuditLabActor();
	if (!resolved.ok) {
		return NextResponse.json(
			{ error: resolved.error },
			{ status: resolved.status },
		);
	}

	try {
		const { attemptId } = await context.params;
		const result = await deleteVoicePracticeRecording(
			resolved.actor,
			attemptId,
		);
		if (result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ data: result });
	} catch (error) {
		console.error(
			"[SERVER] DELETE /api/audit-lab/practice/[attemptId]/recording:",
			error,
		);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"Could not delete that recording. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
