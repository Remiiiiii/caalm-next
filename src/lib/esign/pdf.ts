import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { loadEsignDocumentBuffer } from "./document-bytes";
import type { EsignEnvelope, EsignRecipient } from "./types";

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
	const match = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl);
	if (!match) return null;
	return Uint8Array.from(Buffer.from(match[1], "base64"));
}

/**
 * Overlay signer marks onto the source PDF and store the sealed file.
 * Uses pdf-lib at runtime; returns the original file id if overlay fails.
 */
export async function sealSignedPdf(envelope: EsignEnvelope): Promise<string> {
	const sourceId = envelope.documentFileId;
	if (!sourceId) return sourceId;

	try {
		const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
		const buffer = await loadEsignDocumentBuffer({
			documentFileId: sourceId,
			resourceType: envelope.resourceType,
			resourceId: envelope.resourceId,
		});
		const pdf = await PDFDocument.load(buffer);
		const font = await pdf.embedFont(StandardFonts.Helvetica);
		const pages = pdf.getPages();

		for (const field of envelope.fields) {
			const page = pages[Math.max(0, (field.page || 1) - 1)];
			if (!page) continue;
			const { width, height } = page.getSize();
			const x = (field.x / 100) * width;
			const y = height - (field.y / 100) * height - (field.height / 100) * height;
			const w = (field.width / 100) * width;
			const h = (field.height / 100) * height;
			const recipient = envelope.recipients.find((r) => r.id === field.recipientId);

			if (field.type === "signature" && recipient?.signatureDataUrl) {
				const bytes = dataUrlToBytes(recipient.signatureDataUrl);
				if (bytes) {
					const image = await pdf.embedPng(bytes).catch(async () =>
						pdf.embedJpg(bytes),
					);
					page.drawImage(image, { x, y, width: w, height: h });
					continue;
				}
			}

			const text =
				field.value ||
				(field.type === "date"
					? (recipient?.signedAt || "").slice(0, 10)
					: recipient?.name || "");
			if (text) {
				const fontSize =
					field.type === "date"
						? Math.min(16, Math.max(11, h * 0.65))
						: Math.min(12, h);
				page.drawText(text.slice(0, 80), {
					x,
					y: y + Math.max(2, (h - fontSize) / 2),
					size: fontSize,
					font,
					color: rgb(0.05, 0.2, 0.35),
				});
			}
		}

		appendCertificatePage(pdf, font, envelope, rgb);

		const sealed = await pdf.save();
		return uploadSealedPdf(envelope, Buffer.from(sealed));
	} catch (error) {
		console.warn(
			"[esign] PDF seal failed; keeping original document",
			error instanceof Error ? error.message : error,
		);
		return sourceId;
	}
}

function appendCertificatePage(
	pdf: {
		addPage: (size: [number, number]) => {
			drawText: (text: string, opts: Record<string, unknown>) => void;
			getSize: () => { width: number; height: number };
		};
	},
	font: unknown,
	envelope: EsignEnvelope,
	rgb: (r: number, g: number, b: number) => unknown,
): void {
	const page = pdf.addPage([612, 792]);
	const { height } = page.getSize();
	page.drawText("CAALM Execute — Certificate of completion", {
		x: 48,
		y: height - 72,
		size: 16,
		font,
		color: rgb(0.06, 0.33, 0.52),
	});
	page.drawText(`Document: ${envelope.title || envelope.resourceId}`, {
		x: 48,
		y: height - 108,
		size: 11,
		font,
		color: rgb(0.2, 0.25, 0.3),
	});
	page.drawText(`Completed: ${envelope.completedAt || new Date().toISOString()}`, {
		x: 48,
		y: height - 128,
		size: 11,
		font,
		color: rgb(0.2, 0.25, 0.3),
	});

	envelope.recipients
		.filter((r: EsignRecipient) => r.role === "signer")
		.forEach((recipient, index) => {
			page.drawText(
				`${recipient.name} <${recipient.email}> — ${recipient.status}${
					recipient.signedAt ? ` at ${recipient.signedAt}` : ""
				}`,
				{
					x: 48,
					y: height - 168 - index * 20,
					size: 10,
					font,
					color: rgb(0.2, 0.25, 0.3),
				},
			);
		});
}

async function uploadSealedPdf(
	envelope: EsignEnvelope,
	bytes: Buffer,
): Promise<string> {
	const { storage } = await createAdminClient();
	const bucketId = appwriteConfig.bucketId;
	if (!bucketId) return envelope.documentFileId;

	const uploaded = await storage.createFile({
		bucketId,
		fileId: ID.unique(),
		file: InputFile.fromBuffer(bytes, `signed-${envelope.resourceId}.pdf`),
	});
	return uploaded.$id;
}
