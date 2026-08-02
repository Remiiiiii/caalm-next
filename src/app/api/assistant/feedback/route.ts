import { type NextRequest, NextResponse } from "next/server";
import {
	isAssistantAuthError,
	requireAssistantAccess,
} from "@/lib/assistant/auth";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function POST(request: NextRequest) {
	const auth = await requireAssistantAccess();
	if (isAssistantAuthError(auth)) return auth;

	const body = await request.json();
	const rating = body.rating === "up" || body.rating === "down" ? body.rating : null;
	const comment =
		typeof body.comment === "string" ? body.comment.trim().slice(0, 1000) : "";
	const conversationId =
		typeof body.conversationId === "string" ? body.conversationId : undefined;
	const messageId =
		typeof body.messageId === "string" ? body.messageId : undefined;

	if (!rating) {
		return NextResponse.json({ error: "rating is required" }, { status: 400 });
	}
	if (rating === "down" && comment.length < 1) {
		return NextResponse.json(
			{ error: "Comments must be at least 1 character" },
			{ status: 400 },
		);
	}

	const userName =
		(auth.user as { fullName?: string }).fullName ||
		auth.user.name ||
		auth.user.email ||
		"User";

	await logAuditEvent({
		event_id: `assistant_feedback_${Date.now()}`,
		event_title: `Assistant feedback: ${rating}`,
		action: "create",
		source: "caalm",
		user_id: auth.user.$id,
		user_name: userName,
		user_email: auth.user.email || "",
		status: "success",
		orgId: auth.orgId,
		module: "system",
		target_type: "assistant_feedback",
		target_id: messageId || conversationId || "unknown",
		summary: `User left ${rating} feedback on CAALM assistant`,
		metadata: {
			source: "ai_assistant",
			rating,
			comment: comment || undefined,
			conversationId,
			messageId,
		},
	}).catch(() => undefined);

	return NextResponse.json({ success: true });
}
