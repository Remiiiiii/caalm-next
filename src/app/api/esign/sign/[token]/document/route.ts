import { type NextRequest, NextResponse } from "next/server";
import { loadEsignDocumentBuffer } from "@/lib/esign/document-bytes";
import {
	getEnvelope,
	publicSigningView,
} from "@/lib/esign/envelope-service";
import { EsignLinkError } from "@/lib/esign/errors";
import { parseSigningToken } from "@/lib/esign/token";

/**
 * Token-gated PDF stream for public recipients.
 * Signers may have no app session, so `/api/files/download` is not usable here.
 */
export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	const parsed = parseSigningToken(decodeURIComponent(token));
	if (!parsed) {
		return NextResponse.json(
			{ error: "Invalid signing link", code: "ESIGN-404" },
			{ status: 404 },
		);
	}

	const envelope = await getEnvelope(parsed.envelopeId);
	if (!envelope) {
		return NextResponse.json(
			{ error: "Envelope not found", code: "ESIGN-404" },
			{ status: 404 },
		);
	}

	try {
		// Same validity checks as the sign view (expired / voided / wrong recipient).
		publicSigningView(envelope, parsed.recipientId);
	} catch (error) {
		if (error instanceof EsignLinkError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}
		return NextResponse.json(
			{ error: "Unavailable", code: "ESIGN-400" },
			{ status: 400 },
		);
	}

	try {
		const buffer = await loadEsignDocumentBuffer({
			documentFileId: envelope.documentFileId,
			resourceType: envelope.resourceType,
			resourceId: envelope.resourceId,
		});
		const filename = `${(envelope.title || "document").replace(/[^\w.-]+/g, "_").slice(0, 80)}.pdf`;
		return new NextResponse(new Uint8Array(buffer), {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="${filename}"`,
				"Cache-Control": "private, no-store",
			},
		});
	} catch {
		return NextResponse.json(
			{ error: "Could not load document", code: "ESIGN-404" },
			{ status: 404 },
		);
	}
}
