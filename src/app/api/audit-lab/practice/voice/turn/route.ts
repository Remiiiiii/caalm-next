import { type NextRequest, NextResponse } from "next/server";
import { recordVoiceTurn } from "@/lib/audit-lab/service";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

/**
 * Internal, server-to-server only — called by the voice-agent worker process
 * (`worker/voice-agent`), not a browser. Authenticated by a shared secret
 * header, not a user session, since the worker has no CAALM login.
 */
export async function POST(request: NextRequest) {
	const secret = request.headers.get("x-voice-agent-secret");
	if (!secret || secret !== process.env.VOICE_AGENT_SHARED_SECRET) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			attemptId?: string;
			questionId?: string;
			question?: string;
			answer?: string;
			citedEvidence?: string;
			answerQuality?: "strong" | "adequate" | "weak";
		};
		const quality = body.answerQuality;
		const answerQuality =
			quality === "strong" || quality === "adequate" || quality === "weak"
				? quality
				: undefined;
		const result = await recordVoiceTurn(String(body.attemptId ?? ""), {
			questionId: String(body.questionId ?? ""),
			question: String(body.question ?? ""),
			answer: String(body.answer ?? ""),
			citedEvidence: body.citedEvidence,
			answerQuality,
		});
		if (result.error) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ data: result });
	} catch (error) {
		console.error("[SERVER] POST /api/audit-lab/practice/voice/turn:", error);
		return NextResponse.json(
			{
				error: toUserFacingErrorMessage(error, "Could not record that turn."),
			},
			{ status: 500 },
		);
	}
}
