import { type NextRequest, NextResponse } from "next/server";
import { getMessage } from "@/lib/gmail/client";
import { requireGmailAccess } from "@/lib/gmail/require-access";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const access = await requireGmailAccess(request);
	if (!access.ok) return access.response;

	const { id } = await context.params;

	try {
		const message = await getMessage(access.accessToken, id);
		return NextResponse.json({ message });
	} catch (error) {
		console.error("[SERVER] Gmail get message:", error);
		return NextResponse.json(
			{
				error: "Failed to load message",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
