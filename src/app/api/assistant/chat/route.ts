import { type NextRequest, NextResponse } from "next/server";
import {
	isAssistantAuthError,
	requireAssistantAccess,
} from "@/lib/assistant/auth";
import {
	appendMessage,
	getConversationForUser,
	setConversationActive,
	truncatePreview,
	updateConversationMeta,
} from "@/lib/assistant/conversationStore";
import { checkAssistantRateLimit } from "@/lib/assistant/rateLimit";
import { runAssistantTurn } from "@/lib/assistant/runAssistantTurn";

export async function POST(request: NextRequest) {
	const auth = await requireAssistantAccess();
	if (isAssistantAuthError(auth)) return auth;

	const rate = checkAssistantRateLimit(auth.user.$id);
	if (!rate.allowed) {
		return NextResponse.json(
			{ error: "Rate limit exceeded. Try again later." },
			{ status: 429 },
		);
	}

	const body = await request.json();
	const conversationId = body.conversationId as string | undefined;
	const message = typeof body.message === "string" ? body.message.trim() : "";
	const pathname =
		typeof body.pathname === "string" ? body.pathname : undefined;

	if (!message) {
		return NextResponse.json({ error: "Message is required" }, { status: 400 });
	}

	let convId = conversationId;
	if (!convId) {
		const { createConversation } = await import(
			"@/lib/assistant/conversationStore"
		);
		const created = await createConversation({
			userId: auth.user.$id,
			orgId: auth.orgId,
			title: truncatePreview(message, 80),
		});
		convId = created.$id;
	} else {
		const existing = await getConversationForUser(
			convId,
			auth.user.$id,
			auth.orgId,
		);
		if (!existing) {
			return NextResponse.json({ error: "Not found" }, { status: 404 });
		}
		if (existing.status === "closed") {
			return NextResponse.json(
				{
					error:
						"This conversation is closed. Start a new chat to continue.",
				},
				{ status: 409 },
			);
		}
		await setConversationActive({
			conversationId: convId,
			userId: auth.user.$id,
			orgId: auth.orgId,
		});
	}

	const history =
		(Array.isArray(body.history) &&
			body.history
				.filter(
					(m: { role?: string; content?: string }) =>
						m?.role && m?.content,
				)
				.map((m: { role: string; content: string }) => ({
					role: m.role === "assistant" ? "assistant" : "user",
					content: String(m.content),
				}))) ||
		[];

	await appendMessage({
		conversationId: convId,
		userId: auth.user.$id,
		orgId: auth.orgId,
		role: "user",
		content: message,
	});

	const turn = await runAssistantTurn({
		ctx: auth,
		messages: history,
		userMessage: message,
		pathname,
	});

	await appendMessage({
		conversationId: convId,
		userId: auth.user.$id,
		orgId: auth.orgId,
		role: "assistant",
		content: turn.answer,
		sourcesJson: JSON.stringify(turn.sources),
		metadataJson: JSON.stringify({
			...(turn.pendingAction
				? { pendingActionId: turn.pendingAction.id }
				: {}),
			...(turn.suggestions?.length ? { suggestions: turn.suggestions } : {}),
		}),
	});

	const now = new Date().toISOString();
	await updateConversationMeta(convId, {
		lastMessageAt: now,
		lastMessagePreview: truncatePreview(
			turn.answer.replace(/[#*`]/g, ""),
			120,
		),
		title: truncatePreview(message, 80),
	});

	return NextResponse.json({
		success: true,
		data: {
			conversationId: convId,
			answer: turn.answer,
			sources: turn.sources,
			suggestions: turn.suggestions ?? [],
			pendingAction: turn.pendingAction,
			clientAction: turn.clientAction,
		},
	});
}
