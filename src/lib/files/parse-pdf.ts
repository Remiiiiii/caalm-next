import type PDFParse from "pdf-parse-debugging-disabled";

export type ParsedPdf = Awaited<ReturnType<typeof PDFParse>>;

/**
 * Copy into a standalone, exactly-sized Uint8Array.
 *
 * Node 24 serves small Buffers (a typical PDF upload) from a shared 64 KB pool, so
 * `buffer.byteOffset` is often non-zero. pdf-parse's bundled pdf.js 1.10 reads the
 * whole backing ArrayBuffer, so it searches pool garbage for the xref table and fails
 * at random ("bad XRef entry", "Command token too long"). A copy has offset 0 and no
 * trailing bytes.
 */
export function toStandalonePdfBytes(buffer: Uint8Array): Uint8Array {
	return new Uint8Array(buffer);
}

/** Parse a PDF with pdf-parse, safe against pooled Buffers. Use this, not pdf-parse directly. */
export async function parsePdfText(
	buffer: Uint8Array,
	options?: Record<string, unknown>,
): Promise<ParsedPdf> {
	const pdfParse = (await import("pdf-parse-debugging-disabled")).default;
	// pdf-parse only needs Uint8Array semantics; its d.ts says Buffer.
	return pdfParse(toStandalonePdfBytes(buffer) as Buffer, options);
}
