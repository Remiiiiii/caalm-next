import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import {
	recordVoiceConsent,
	requestFeedback,
	scoreAnswer,
	startPracticeRound,
	startVoicePracticeRound,
} from "@/lib/audit-lab/service";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

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

	try {
		const body = (await request.json()) as {
			action?: string;
			sessionId?: string;
			attemptId?: string;
			answer?: string;
			score?: number;
			persona?: string;
			difficulty?: string;
			retrievalMs?: number;
			showMe?: boolean;
		};
		const action = String(body.action ?? "start");
		if (action === "start_voice") {
			const result = await startVoicePracticeRound(
				resolved.actor,
				String(body.sessionId ?? ""),
				body.persona,
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		if (action === "consent") {
			const result = await recordVoiceConsent(String(body.attemptId ?? ""));
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		if (action === "score") {
			const result = await scoreAnswer(
				resolved.actor,
				String(body.attemptId ?? ""),
				String(body.answer ?? ""),
				Number(body.score ?? 3),
				{
					retrievalMs:
						typeof body.retrievalMs === "number" ? body.retrievalMs : undefined,
					showMe: Boolean(body.showMe),
				},
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		if (action === "feedback") {
			const result = await requestFeedback(
				resolved.actor,
				String(body.attemptId ?? ""),
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		const result = await startPracticeRound(
			resolved.actor,
			String(body.sessionId ?? ""),
			body.persona,
			body.difficulty,
		);
		if (result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ data: result });
	} catch (error) {
		console.error("[SERVER] POST /api/audit-lab/practice:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't run that practice step. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
