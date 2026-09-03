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

export async function convertDocxBufferToPdf(docxBuffer: Buffer): Promise<Buffer> {
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
	const streamAsset = await pdfServices.getContent({
		asset: result.result.asset,
	});
	return streamToBuffer(streamAsset.readStream);
}
