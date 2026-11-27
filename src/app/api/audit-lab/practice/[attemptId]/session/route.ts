import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { getAttempt, listQuestions } from "@/lib/audit-lab/repository";
import {
	listSessionParticipants,
	listTranscriptTurns,
} from "@/lib/audit-lab/service";
import { buildVoiceRubric } from "@/lib/audit-lab/voice/rubric";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Seeds the live-interview UI (roster, transcript, rubric "current question")
 * from Appwrite on mount/refresh, so a reload doesn't leave the panel blank
 * until the next LiveKit event arrives.
 */
export async function GET(
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

	try {
		const { attemptId } = await context.params;
		const attempt = await getAttempt(resolved.actor.orgId, attemptId);
		if (!attempt) {
			return NextResponse.json(
				{ error: "I couldn't find that practice attempt." },
				{ status: 404 },
			);
		}
		const [participantsResult, transcriptTurns, questions] = await Promise.all([
			listSessionParticipants(resolved.actor, attemptId),
			listTranscriptTurns(resolved.actor.orgId, attemptId),
			listQuestions(resolved.actor.orgId, attempt.sessionId),
		]);
		return NextResponse.json({
			data: {
				status: attempt.status,
				currentQuestionId: attempt.currentQuestionId || null,
				participants: participantsResult.participants ?? [],
				transcriptTurns,
				rubric: buildVoiceRubric(questions),
			},
		});
	} catch (error) {
		console.error(
			"[SERVER] GET /api/audit-lab/practice/[attemptId]/session:",
			error,
		);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"Could not load the interview session.",
				),
			},
			{ status: 500 },
		);
	}
}
