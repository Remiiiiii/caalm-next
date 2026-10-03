import { type NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/gmail/client";
import { requireGmailAccess } from "@/lib/gmail/require-access";

export async function POST(request: NextRequest) {
	const access = await requireGmailAccess(request);
	if (!access.ok) return access.response;

	try {
		const body = await request.json();
		const to = String(body.to || "").trim();
		const subject = String(body.subject || "").trim();
		const text = String(body.body || body.text || "").trim();
		const contentType =
			body.contentType === "html" || body.isHtml === true ? "html" : "text";
		const threadId = body.threadId ? String(body.threadId) : undefined;
		const inReplyTo = body.inReplyTo ? String(body.inReplyTo) : undefined;
		const references = body.references ? String(body.references) : undefined;

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
			fromEmail: access.email,
			threadId,
			inReplyTo,
			references,
			contentType,
		});

		return NextResponse.json({ success: true, messageId: result.id });
	} catch (error) {
		console.error("[SERVER] Gmail send:", error);
		return NextResponse.json(
			{
				error: "Failed to send message",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
