import { convertDocxBufferToPdf } from "@/lib/templates/docx-to-pdf";
import { docxBufferToHtml } from "@/lib/templates/docx-preview";
import { loadLatestNegotiationDocx } from "./accept-redline.service";
import {
	polishNegotiationDocx,
	polishNegotiationHtml,
} from "./print-polish";

export type NegotiationPreviewResult =
	| { kind: "pdf"; buffer: Buffer }
	| { kind: "html"; html: string };

/**
 * Preview the stored negotiation DOCX (source of truth). Prefer Gotenberg/Adobe
 * PDF; fall back to letterheaded Mammoth HTML from the same file.
 */
export async function buildNegotiationPreview(input: {
	contractId: string;
	orgId: string;
}): Promise<NegotiationPreviewResult> {
	const loaded = await loadLatestNegotiationDocx(input);
	// Align Term dates / drop redundant party lines before letterheaded output.
	const docx = polishNegotiationDocx(loaded.docx);

	try {
		const buffer = await convertDocxBufferToPdf(docx);
		return { kind: "pdf", buffer };
	} catch {
		/* Mammoth letterhead from the same DOCX */
	}

	const html = polishNegotiationHtml(await docxBufferToHtml(docx));
	if (html?.trim()) {
		return { kind: "html", html };
	}

	throw new Error(
		"Could not build a PDF or HTML preview from the negotiation Word draft",
	);
}

/** @deprecated Prefer buildNegotiationPreview. */
export async function buildNegotiationPreviewPdf(input: {
	contractId: string;
	orgId: string;
}): Promise<Buffer> {
	const result = await buildNegotiationPreview(input);
	if (result.kind === "pdf") return result.buffer;
	throw new Error(
		"PDF conversion failed; open preview again to use the HTML letterhead view.",
	);
}
