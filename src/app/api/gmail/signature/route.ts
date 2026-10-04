import { type NextRequest, NextResponse } from "next/server";
import { requireGmailAccess } from "@/lib/gmail/require-access";
import { fetchGmailSignatureHtml } from "@/lib/gmail/signature";
import { sanitizeSignatureHtml } from "@/lib/email/signature";

export async function GET(request: NextRequest) {
	const access = await requireGmailAccess(request);
	if (!access.ok) return access.response;

	try {
		const raw = await fetchGmailSignatureHtml(
			access.accessToken,
			access.email,
		);
		const signatureHtml = raw ? sanitizeSignatureHtml(raw) : null;
		return NextResponse.json({
			signatureHtml,
			email: access.email,
			source: "gmail_send_as",
		});
	} catch (error) {
		console.error("[SERVER] Gmail signature:", error);
		return NextResponse.json(
			{
				error: "Failed to load Gmail signature",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
