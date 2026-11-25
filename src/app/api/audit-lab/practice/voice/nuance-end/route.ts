import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { getAttempt } from "@/lib/audit-lab/repository";
import { finalizeNuanceInterview } from "@/lib/audit-lab/service";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Called from the browser when a Nuance Live call ends (`session-ended`) or
 * the tab is closing — there is no LiveKit `room_finished` webhook for a
 * Nuance-hosted conversation, so this is what triggers grading.
 */
export async function POST(request: NextRequest) {
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
	const { actor } = resolved;

	try {
		const body = (await request.json()) as { attemptId?: string };
		const attemptId = String(body.attemptId ?? "");
		const attempt = await getAttempt(actor.orgId, attemptId);
		if (!attempt) {
			return NextResponse.json(
				{ error: "I couldn't find that practice attempt." },
				{ status: 404 },
			);
		}
		if (attempt.intervieweeUserId !== actor.userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}
		const result = await finalizeNuanceInterview(attemptId);
		if (result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ data: result });
	} catch (error) {
		console.error(
			"[SERVER] POST /api/audit-lab/practice/voice/nuance-end:",
			error,
		);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(error, "Could not end the interview."),
			},
			{ status: 500 },
		);
	}
}
