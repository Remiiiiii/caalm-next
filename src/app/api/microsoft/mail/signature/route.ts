import { type NextRequest, NextResponse } from "next/server";
import { fetchOutlookSignatureHtml } from "@/lib/microsoft/mail-client";
import { requireOutlookMailAccess } from "@/lib/microsoft/require-mail-access";

export async function GET(request: NextRequest) {
	const access = await requireOutlookMailAccess(request);
	if (!access.ok) return access.response;

	try {
		const signatureHtml = await fetchOutlookSignatureHtml(access.accessToken);
		return NextResponse.json({
			signatureHtml,
			email: access.email,
			// Graph has no signature API — inferred from Sent Items HTML + cid images
			source: "outlook_sent_items",
		});
	} catch (error) {
		console.error("[SERVER] Outlook mail signature:", error);
		return NextResponse.json(
			{
				error: "Failed to load Outlook signature",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
