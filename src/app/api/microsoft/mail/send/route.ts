import { type NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/microsoft/mail-client";
import { requireOutlookMailAccess } from "@/lib/microsoft/require-mail-access";

export async function POST(request: NextRequest) {
	const access = await requireOutlookMailAccess(request);
	if (!access.ok) return access.response;

	try {
		const body = await request.json();
		const to = String(body.to || "").trim();
		const subject = String(body.subject || "").trim();
		const text = String(body.body || body.text || "").trim();
		const replyToMessageId = body.replyToMessageId
			? String(body.replyToMessageId)
			: undefined;

		if (!to || !subject) {
			return NextResponse.json(
				{ error: "To and subject are required" },
				{ status: 400 },
			);
		}

		const result = await sendMessage(access.accessToken, {
			to,
			subject,
			body: text,
			replyToMessageId,
		});

		return NextResponse.json({ success: true, messageId: result.id });
	} catch (error) {
		console.error("[SERVER] Outlook mail send:", error);
		return NextResponse.json(
			{
				error: "Failed to send message",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
