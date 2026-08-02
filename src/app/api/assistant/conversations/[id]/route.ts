import { type NextRequest, NextResponse } from "next/server";
import {
	isAssistantAuthError,
	requireAssistantAccess,
} from "@/lib/assistant/auth";
import {
	closeOtherActiveConversations,
	getConversationForUser,
	listMessages,
	updateConversationMeta,
} from "@/lib/assistant/conversationStore";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
	const auth = await requireAssistantAccess();
	if (isAssistantAuthError(auth)) return auth;

	const { id } = await params;
	const conversation = await getConversationForUser(
		id,
		auth.user.$id,
		auth.orgId,
	);
	if (!conversation) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const messages = await listMessages(id);
	return NextResponse.json({
		success: true,
		data: { conversation, messages },
	});
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
	const auth = await requireAssistantAccess();
	if (isAssistantAuthError(auth)) return auth;

	const { id } = await params;
	const conversation = await getConversationForUser(
		id,
		auth.user.$id,
		auth.orgId,
	);
	if (!conversation) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = await request.json();
	const patch: Record<string, string> = {};
	if (typeof body.title === "string") patch.title = body.title.slice(0, 256);
	if (body.status === "active" || body.status === "closed") {
		patch.status = body.status;
	}

	if (Object.keys(patch).length) {
		if (patch.status === "active") {
			await closeOtherActiveConversations(auth.user.$id, auth.orgId, id);
		}
		await updateConversationMeta(id, patch);
	}

	const updated = await getConversationForUser(
		id,
		auth.user.$id,
		auth.orgId,
	);
	return NextResponse.json({ success: true, data: { conversation: updated } });
}
