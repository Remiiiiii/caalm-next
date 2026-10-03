import { type NextRequest, NextResponse } from "next/server";
import { listInboxMessages } from "@/lib/microsoft/mail-client";
import { requireOutlookMailAccess } from "@/lib/microsoft/require-mail-access";

export async function GET(request: NextRequest) {
	const access = await requireOutlookMailAccess(request);
	if (!access.ok) return access.response;

	const { searchParams } = new URL(request.url);
	const maxResults = Number(searchParams.get("maxResults") || "50");

	try {
		const messages = await listInboxMessages(access.accessToken, {
			maxResults: Number.isFinite(maxResults) ? maxResults : 50,
		});
		return NextResponse.json({ messages, email: access.email });
	} catch (error) {
		console.error("[SERVER] Outlook mail list messages:", error);
		return NextResponse.json(
			{
				error: "Failed to load messages",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
