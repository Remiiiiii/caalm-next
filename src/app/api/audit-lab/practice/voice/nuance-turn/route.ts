import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import { getAttempt, listQuestions } from "@/lib/audit-lab/repository";
import { listTranscriptTurns, recordVoiceTurn } from "@/lib/audit-lab/service";
import { buildVoiceRubric } from "@/lib/audit-lab/voice/rubric";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Browser-originated equivalent of /api/audit-lab/practice/voice/turn, used
 * only by Nuance Live calls (Simone/Valentina): Nuance's client-delegation
 * tool calls land in the page, authenticated as the logged-in user, not a
 * trusted worker process — so this route re-checks ownership and the rubric
 * itself instead of trusting the browser's claimed questionId.
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
		const body = (await request.json()) as {
			attemptId?: string;
			questionId?: string;
			answerSummary?: string;
			citedEvidence?: string;
			answerQuality?: "strong" | "adequate" | "weak";
		};
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

		const questions = await listQuestions(actor.orgId, attempt.sessionId);
		const rubric = buildVoiceRubric(questions);
		const item = rubric.find((r) => r.questionId === body.questionId);
		if (!item) {
			return NextResponse.json(
				{
					error:
						"Unknown questionId — it must be one of this session's rubric items.",
				},
				{ status: 400 },
			);
		}
		const quality = body.answerQuality;
		const answerQuality =
			quality === "strong" || quality === "adequate" || quality === "weak"
				? quality
				: undefined;

		const result = await recordVoiceTurn(attemptId, {
			questionId: item.questionId,
			question: item.prompt,
			answer: String(body.answerSummary ?? ""),
			citedEvidence: body.citedEvidence,
			answerQuality,
		});
		if (result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}

		// Fixed rubric order, not the worker's answer-quality-adaptive reordering
		// (that logic lives only in worker/voice-agent, not shared with this app) —
		// still covers every item, just not reprioritized on a weak answer.
		const turns = await listTranscriptTurns(actor.orgId, attemptId);
		const covered = new Set(turns.map((t) => t.questionId));
		const next = rubric.find((r) => !covered.has(r.questionId)) ?? null;
		return NextResponse.json({
			data: {
				next: next
					? { questionId: next.questionId, prompt: next.prompt }
					: null,
				remaining: rubric.length - covered.size,
			},
		});
	} catch (error) {
		console.error(
			"[SERVER] POST /api/audit-lab/practice/voice/nuance-turn:",
			error,
		);
		return NextResponse.json(
			{ error: toUserFacingErrorMessage(error, "Could not record that turn.") },
			{ status: 500 },
		);
	}
}
