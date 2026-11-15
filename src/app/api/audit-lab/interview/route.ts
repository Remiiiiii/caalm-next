import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { resolveAuditLabActor } from "@/lib/audit-lab/actor";
import {
	addQuestion,
	generateInterviewScript,
	generateQuestionBank,
	importQuestionsFromFindings,
} from "@/lib/audit-lab/service";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT_LAB.MANAGE_SESSIONS,
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
			prompt?: string;
			difficulty?: string;
		};
		const sessionId = String(body.sessionId ?? "");
		const action = String(body.action ?? "generate_bank");
		if (action === "add") {
			const result = await addQuestion(
				resolved.actor,
				sessionId,
				String(body.prompt ?? ""),
				body.difficulty,
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		if (action === "import_findings") {
			const result = await importQuestionsFromFindings(
				resolved.actor,
				sessionId,
			);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		if (action === "script") {
			const result = await generateInterviewScript(resolved.actor, sessionId);
			if (result.error) {
				return NextResponse.json({ error: result.error }, { status: 400 });
			}
			return NextResponse.json({ data: result });
		}
		const result = await generateQuestionBank(resolved.actor, sessionId);
		if (result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ data: result });
	} catch (error) {
		console.error("[SERVER] POST /api/audit-lab/interview:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(
					error,
					"I couldn't update the interview. Please try again.",
				),
			},
			{ status: 500 },
		);
	}
}
