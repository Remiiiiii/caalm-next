import { type NextRequest, NextResponse } from "next/server";
import { listMessages } from "@/lib/gmail/client";
import { requireGmailAccess } from "@/lib/gmail/require-access";

export async function GET(request: NextRequest) {
	const access = await requireGmailAccess(request);
	if (!access.ok) return access.response;

	const { searchParams } = new URL(request.url);
	const maxResults = Number(searchParams.get("maxResults") || "25");
	const labelIds = searchParams.get("labelIds") || "INBOX";

	try {
		const messages = await listMessages(access.accessToken, {
			labelIds,
			maxResults: Number.isFinite(maxResults) ? maxResults : 25,
		});
		return NextResponse.json({ messages, email: access.email });
	} catch (error) {
		console.error("[SERVER] Gmail list messages:", error);
		return NextResponse.json(
			{
				error: "Failed to load messages",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
