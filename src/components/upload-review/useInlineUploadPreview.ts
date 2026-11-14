"use client";

import { useEffect, useState } from "react";

type PreviewFile = {
	name: string;
	type: string;
	arrayBuffer?: ArrayBuffer;
	base64Content?: string;
} | null;

export type InlineUploadPreview = {
	pdfUrl: string | null;
	htmlContent: string | null;
	textContent: string | null;
	downloadOnly: boolean;
};

function toArrayBuffer(input: unknown): ArrayBuffer | null {
	if (input instanceof ArrayBuffer && input.byteLength > 0) return input;
	if (ArrayBuffer.isView(input)) {
		return input.buffer.slice(
			input.byteOffset,
			input.byteOffset + input.byteLength,
		) as ArrayBuffer;
	}
	return null;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer | null {
	try {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return bytes.buffer;
	} catch {
		return null;
	}
}

const emptyPreview: InlineUploadPreview = {
	pdfUrl: null,
	htmlContent: null,
	textContent: null,
	downloadOnly: false,
};

/** Inline pane preview for wizard review step (PDF / docx / txt). */
export function useInlineUploadPreview(
	file: PreviewFile,
	enabled: boolean,
): InlineUploadPreview {
	const [preview, setPreview] = useState<InlineUploadPreview>(emptyPreview);

	useEffect(() => {
		if (!enabled || !file) {
			setPreview((prev) =>
				prev === emptyPreview ||
				(!prev.pdfUrl &&
					!prev.htmlContent &&
					prev.textContent == null &&
					!prev.downloadOnly)
					? prev
					: emptyPreview,
			);
			return;
		}

		let cancelled = false;
		let blobUrl: string | null = null;

		const apply = (next: InlineUploadPreview) => {
			if (!cancelled) setPreview(next);
		};

		const openFromBuffer = async (buffer: ArrayBuffer) => {
			const lower = file.name.toLowerCase();
			const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
			const isDocx =
				lower.endsWith(".docx") ||
				file.type.includes(
					"application/vnd.openxmlformats-officedocument.wordprocessingml",
				);
			const isTxt =
				lower.endsWith(".txt") || file.type.startsWith("text/");
			const isLegacyDoc =
				lower.endsWith(".doc") && !lower.endsWith(".docx");

			if (isLegacyDoc) {
				apply({ ...emptyPreview, downloadOnly: true });
				return;
			}
			if (isDocx) {
				try {
					const mammoth = (await import("mammoth")).default;
					const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
					apply({
						pdfUrl: null,
						htmlContent: result.value || "<p></p>",
						textContent: null,
						downloadOnly: false,
					});
				} catch {
					apply(emptyPreview);
				}
				return;
			}
			if (isTxt) {
				const text = new TextDecoder().decode(buffer);
				apply({
					pdfUrl: null,
					htmlContent: null,
					textContent: text,
					downloadOnly: false,
				});
				return;
			}
			if (isPdf) {
				blobUrl = URL.createObjectURL(
					new Blob([buffer], { type: "application/pdf" }),
				);
				apply({
					pdfUrl: blobUrl,
					htmlContent: null,
					textContent: null,
					downloadOnly: false,
				});
			}
		};

		void (async () => {
			const fromArray = toArrayBuffer(file.arrayBuffer);
			if (fromArray) {
				await openFromBuffer(fromArray);
				return;
			}
			if (file.base64Content) {
				const fromBase64 = base64ToArrayBuffer(file.base64Content);
				if (fromBase64) await openFromBuffer(fromBase64);
			}
		})();

		return () => {
			cancelled = true;
			if (blobUrl) URL.revokeObjectURL(blobUrl);
		};
	}, [enabled, file?.name, file?.type, file?.arrayBuffer, file?.base64Content]);

	return preview;
}