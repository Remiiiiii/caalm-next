import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import {
	getAttempt,
	getSession,
	listQuestions,
} from "@/lib/audit-lab/repository";
import {
	type AuditorPersona,
	INTERVIEWER_PROFILES,
} from "@/lib/audit-lab/roleplay";
import {
	buildNuanceSystemPrompt,
	NUANCE_INTERVIEW_TOOLS,
	NUANCE_PERSONA_BY_AUDITOR,
} from "@/lib/audit-lab/voice/nuance";
import { buildVoiceRubric } from "@/lib/audit-lab/voice/rubric";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

/** Opaque per-attempt identifier Nuance requires — never the user's email or name. */
function nuanceEndUserId(attemptId: string, userId: string): string {
	return createHash("sha256").update(`${attemptId}:${userId}`).digest("hex");
}

/**
 * Mints a short-lived Nuance Live session token for Simone/Valentina's voice
 * call. Simone/Valentina only — other personas use the LiveKit room path
 * started by `start_voice` in /api/audit-lab/practice.
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
		const persona = attempt.persona as AuditorPersona;
		const nuancePersonaId = NUANCE_PERSONA_BY_AUDITOR[persona];
		if (
			INTERVIEWER_PROFILES[persona]?.backend !== "nuance" ||
			!nuancePersonaId
		) {
			return NextResponse.json(
				{ error: "This interviewer doesn't use the Nuance voice backend." },
				{ status: 400 },
			);
		}

		const [session, questions] = await Promise.all([
			getSession(actor.orgId, attempt.sessionId),
			listQuestions(actor.orgId, attempt.sessionId),
		]);
		const systemPrompt = buildNuanceSystemPrompt({
			persona,
			sessionTitle: session?.title ?? "this review",
			rubric: buildVoiceRubric(questions),
		});

		const apiKey = process.env.NUANCE_API_KEY;
		if (!apiKey) {
			return NextResponse.json(
				{ error: "Voice interviewer is not configured yet." },
				{ status: 500 },
			);
		}
		const nuanceRes = await fetch("https://api.nuancelabs.ai/session-tokens", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				personality: {
					system_prompt: systemPrompt,
					persona_id: nuancePersonaId,
				},
				end_user_id: nuanceEndUserId(attemptId, actor.userId),
				interface: "nuance_live",
				interface_setup: {
					runtime_tools: { end_call: true, call_time: true },
					delegation: {
						type: "responses",
						responses: { model: "default", tools: NUANCE_INTERVIEW_TOOLS },
					},
				},
				expressiveness: 2,
			}),
		});
		if (!nuanceRes.ok) {
			const detail = await nuanceRes.text().catch(() => "");
			console.error(
				"[SERVER] POST /api/audit-lab/practice/voice/nuance-token: Nuance error",
				nuanceRes.status,
				detail,
			);
			return NextResponse.json(
				{ error: "Could not start the voice interviewer. Please try again." },
				{ status: 502 },
			);
		}
		const { token } = (await nuanceRes.json()) as { token: string };
		return NextResponse.json({ data: { token } });
	} catch (error) {
		console.error(
			"[SERVER] POST /api/audit-lab/practice/voice/nuance-token:",
			error,
		);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"Could not start the voice interviewer. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
