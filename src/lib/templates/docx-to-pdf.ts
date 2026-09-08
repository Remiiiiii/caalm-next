import { Readable } from "node:stream";

function requireAdobeEnv(): {
	clientId: string;
	clientSecret: string;
} {
	const clientId = process.env.ADOBE_PDF_CLIENT_ID?.trim();
	const clientSecret = process.env.ADOBE_PDF_CLIENT_SECRET?.trim();
	if (!clientId || !clientSecret) {
		throw new Error(
			"Adobe PDF Services is not configured. Set ADOBE_PDF_CLIENT_ID and ADOBE_PDF_CLIENT_SECRET.",
		);
	}
	return { clientId, clientSecret };
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

function gotenbergUrl(): string | null {
	const raw = process.env.GOTENBERG_URL?.trim();
	if (!raw) return null;
	return raw.replace(/\/$/, "");
}

/**
 * Convert DOCX → PDF via Gotenberg (LibreOffice). Preferred for negotiation
 * drafts because it tolerates Word packages Adobe CreatePDF rejects.
 */
export async function convertDocxBufferToPdfWithGotenberg(
	docxBuffer: Buffer,
	baseUrl = gotenbergUrl(),
): Promise<Buffer> {
	if (!baseUrl) {
		throw new Error("GOTENBERG_URL is not configured");
	}
	if (!docxBuffer?.length) {
		throw new Error("DOCX buffer is empty; cannot build PDF.");
	}

	const form = new FormData();
	form.append(
		"files",
		new Blob([new Uint8Array(docxBuffer)], {
			type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		}),
		"document.docx",
	);

	const response = await fetch(`${baseUrl}/forms/libreoffice/convert`, {
		method: "POST",
		body: form,
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		throw new Error(
			`Gotenberg conversion failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
		);
	}
	const bytes = Buffer.from(await response.arrayBuffer());
	if (!bytes.length) {
		throw new Error("Gotenberg returned an empty PDF");
	}
	return bytes;
}

async function convertDocxBufferToPdfWithAdobe(
	docxBuffer: Buffer,
): Promise<Buffer> {
	const { clientId, clientSecret } = requireAdobeEnv();
	const adobe = await import("@adobe/pdfservices-node-sdk");
	const credentials = new adobe.ServicePrincipalCredentials({
		clientId,
		clientSecret,
	});
	const pdfServices = new adobe.PDFServices({ credentials });
	const inputAsset = await pdfServices.upload({
		readStream: Readable.from(docxBuffer),
		mimeType: adobe.MimeType.DOCX,
	});
	const job = new adobe.CreatePDFJob({ inputAsset });
	const pollingURL = await pdfServices.submit({ job });
	const result = await pdfServices.getJobResult({
		pollingURL,
		resultType: adobe.CreatePDFResult,
	});
	const asset = result.result?.asset;
	if (!asset) {
		throw new Error("Adobe PDF conversion completed without a result asset.");
	}
	const streamAsset = await pdfServices.getContent({
		asset,
	});
	return streamToBuffer(streamAsset.readStream);
}

/**
 * DOCX → PDF. Prefer Gotenberg when GOTENBERG_URL is set; otherwise Adobe.
 * Callers that need HTML fallback should catch and use Mammoth themselves.
 */
export async function convertDocxBufferToPdf(
	docxBuffer: Buffer,
): Promise<Buffer> {
	if (!docxBuffer?.length) {
		throw new Error("DOCX buffer is empty; cannot build PDF.");
	}

	const gotenberg = gotenbergUrl();
	if (gotenberg) {
		try {
			return await convertDocxBufferToPdfWithGotenberg(docxBuffer, gotenberg);
		} catch (error) {
			// Fall through to Adobe when Gotenberg is configured but unreachable.
			const adobeConfigured =
				Boolean(process.env.ADOBE_PDF_CLIENT_ID?.trim()) &&
				Boolean(process.env.ADOBE_PDF_CLIENT_SECRET?.trim());
			if (!adobeConfigured) throw error;
		}
	}

	try {
		return await convertDocxBufferToPdfWithAdobe(docxBuffer);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Adobe PDF conversion failed";
		if (/corrupted|cannot be processed/i.test(message)) {
			throw new Error(
				"PDF conversion could not process this Word draft. Check GOTENBERG_URL or the DOCX.",
			);
		}
		throw error instanceof Error ? error : new Error(message);
	}
}
