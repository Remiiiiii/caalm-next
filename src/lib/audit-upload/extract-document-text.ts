const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME = new Set([
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/msword",
	"text/plain",
	"text/markdown",
]);

export class AuditUploadValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AuditUploadValidationError";
	}
}

export function assertAuditUploadFile(file: {
	size: number;
	type?: string;
	name?: string;
}): void {
	if (file.size <= 0) {
		throw new AuditUploadValidationError("The file is empty.");
	}
	if (file.size > MAX_BYTES) {
		throw new AuditUploadValidationError("Audit files must be 25 MB or smaller.");
	}
	const ext = (file.name?.split(".").pop() || "").toLowerCase();
	const mime = (file.type || "").toLowerCase();
	const allowedExt = ["pdf", "docx", "doc", "txt", "md"];
	if (mime && !ALLOWED_MIME.has(mime) && !allowedExt.includes(ext)) {
		throw new AuditUploadValidationError(
			"Use a PDF, Word, or text file for audit upload.",
		);
	}
}

function normalizeExtractedPdfText(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/([^\n])Page\s+(\d+)/gi, "$1\n\nPage $2\n")
		.trim();
}

export async function extractAuditDocumentText(
	buffer: Buffer,
	file: { type?: string; name?: string },
): Promise<string> {
	const type = (file.type || "").toLowerCase();
	const ext = (file.name?.split(".").pop() || "").toLowerCase();

	if (type.includes("pdf") || ext === "pdf") {
		const pdfParse = (await import("pdf-parse-debugging-disabled")).default;
		const data = await pdfParse(buffer);
		return normalizeExtractedPdfText(data.text || "");
	}

	if (
		type.includes("word") ||
		type.includes("officedocument.wordprocessing") ||
		ext === "docx" ||
		ext === "doc"
	) {
		const mammoth = (await import("mammoth")).default;
		const result = await mammoth.extractRawText({ buffer });
		return result.value || "";
	}

	if (type.includes("text") || ext === "txt" || ext === "md") {
		return buffer.toString("utf8");
	}

	try {
		const pdfParse = (await import("pdf-parse-debugging-disabled")).default;
		const data = await pdfParse(buffer);
		if (data.text?.trim()) return normalizeExtractedPdfText(data.text);
	} catch {
		/* last resort below */
	}

	return buffer.toString("utf8");
}
