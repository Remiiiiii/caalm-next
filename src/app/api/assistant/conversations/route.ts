import { type NextRequest, NextResponse } from "next/server";
import {
	isAssistantAuthError,
	requireAssistantAccess,
} from "@/lib/assistant/auth";
import {
	createConversation,
	listConversations,
} from "@/lib/assistant/conversationStore";

export async function GET(request: NextRequest) {
	const auth = await requireAssistantAccess();
	if (isAssistantAuthError(auth)) return auth;

	const { searchParams } = request.nextUrl;
	const limit = Math.min(Number(searchParams.get("limit")) || 30, 50);
	const offset = Number(searchParams.get("offset")) || 0;

	const { conversations, total } = await listConversations({
		userId: auth.user.$id,
		orgId: auth.orgId,
		limit,
		offset,
	});

	return NextResponse.json({ success: true, data: { conversations, total } });
}

export async function POST() {
	const auth = await requireAssistantAccess();
	if (isAssistantAuthError(auth)) return auth;

	const conversation = await createConversation({
		userId: auth.user.$id,
		orgId: auth.orgId,
	});

	return NextResponse.json({ success: true, data: { conversation } });
}
