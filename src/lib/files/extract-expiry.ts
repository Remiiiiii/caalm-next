import { parsePdfText } from "@/lib/files/parse-pdf";

/** Finds "expiry / expiration / end date: YYYY-MM-DD" in document text. */
export function extractExpiryDateFromText(text: string): string | null {
	const match = text.match(
		/(expiry|expiration|end) date[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i,
	);
	return match ? match[2] : null;
}

/** Reads a PDF (or plain-text file) and returns its stated expiry date, if any. */
export async function extractExpiryDateFromFile(
	bytes: Uint8Array,
	mimeType: string,
): Promise<string | null> {
	const text =
		mimeType === "application/pdf"
			? (await parsePdfText(bytes)).text
			: Buffer.from(bytes).toString("utf8");
	return extractExpiryDateFromText(text);
}
