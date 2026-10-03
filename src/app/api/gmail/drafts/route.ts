import { type NextRequest, NextResponse } from "next/server";
import { createDraft, listDrafts } from "@/lib/gmail/client";
import { requireGmailAccess } from "@/lib/gmail/require-access";

export async function GET(request: NextRequest) {
	const access = await requireGmailAccess(request);
	if (!access.ok) return access.response;

	const { searchParams } = new URL(request.url);
	const maxResults = Number(searchParams.get("maxResults") || "100");

	try {
		const drafts = await listDrafts(
			access.accessToken,
			Number.isFinite(maxResults) ? maxResults : 100,
		);
		return NextResponse.json({ drafts, email: access.email });
	} catch (error) {
		console.error("[SERVER] Gmail list drafts:", error);
		return NextResponse.json(
			{
				error: "Failed to load drafts",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}

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

		if (!to || !subject) {
			return NextResponse.json(
				{ error: "To and subject are required" },
				{ status: 400 },
			);
		}

		const result = await createDraft(access.accessToken, {
			to,
			subject,
			body: text,
			fromEmail: access.email,
			contentType,
		});

		return NextResponse.json({ success: true, draftId: result.draftId });
	} catch (error) {
		console.error("[SERVER] Gmail create draft:", error);
		return NextResponse.json(
			{
				error: "Failed to save draft",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}
