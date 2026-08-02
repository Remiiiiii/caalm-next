import { type NextRequest, NextResponse } from "next/server";
import {
	isAssistantAuthError,
	requireAssistantAccess,
} from "@/lib/assistant/auth";
import { appendMessage, truncatePreview, updateConversationMeta } from "@/lib/assistant/conversationStore";
import { runToolByName } from "@/lib/assistant/tools/registry";
import { consumePendingAction } from "@/lib/assistant/tools/types";

export async function POST(request: NextRequest) {
	const auth = await requireAssistantAccess();
	if (isAssistantAuthError(auth)) return auth;

	const body = await request.json();
	const pendingId = body.pendingActionId as string | undefined;
	const conversationId = body.conversationId as string | undefined;

	if (!pendingId) {
		return NextResponse.json(
			{ error: "pendingActionId is required" },
			{ status: 400 },
		);
	}

	const pending = consumePendingAction(pendingId, auth);
	if (!pending) {
		return NextResponse.json(
			{ error: "Action expired or not found" },
			{ status: 410 },
		);
	}

	const toolResult = await runToolByName(
		{ ...auth, pathname: body.pathname },
		pending.toolName,
		pending.args,
	);

	const summary =
		toolResult.result !== undefined
			? `Action completed: ${pending.label}\n\n${JSON.stringify(toolResult.result, null, 2).slice(0, 1500)}`
			: toolResult.error
				? `Action failed: ${toolResult.error}`
				: `Action completed: ${pending.label}`;

	if (conversationId) {
		await appendMessage({
			conversationId,
			userId: auth.user.$id,
			orgId: auth.orgId,
			role: "assistant",
			content: summary,
		});
		await updateConversationMeta(conversationId, {
			lastMessageAt: new Date().toISOString(),
			lastMessagePreview: truncatePreview(summary, 120),
		});
	}

	return NextResponse.json({
		success: true,
		data: {
			result: toolResult,
			summary,
		},
	});
}
