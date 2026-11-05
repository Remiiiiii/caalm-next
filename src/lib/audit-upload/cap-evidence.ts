import type { AuditCapEvidenceAttachment } from "./types";

export const CAP_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const CAP_EVIDENCE_MAX_FILES = 10;
/** Compact grids: up to 10 file tiles in view; overflow tile when total > 10. */
export const CAP_EVIDENCE_COMPACT_FILE_SLOTS = 9;

const ALLOWED_MIME = new Set([
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/webp",
	"image/gif",
	"application/pdf",
]);

export class CapEvidenceValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CapEvidenceValidationError";
	}
}

export function assertCapEvidenceFile(file: File): void {
	const mime = (file.type || "").toLowerCase();
	const name = file.name.toLowerCase();
	const byExt =
		/\.(png|jpe?g|webp|gif|pdf)$/i.test(name) &&
		(mime === "" || mime === "application/octet-stream");
	if (!ALLOWED_MIME.has(mime) && !byExt) {
		throw new CapEvidenceValidationError(
			"Upload a PNG, JPG, WebP, GIF, or PDF file.",
		);
	}
	if (file.size <= 0) {
		throw new CapEvidenceValidationError("That file is empty.");
	}
	if (file.size > CAP_EVIDENCE_MAX_BYTES) {
		throw new CapEvidenceValidationError("Each file must be 10 MB or smaller.");
	}
}

export function isImageMime(mimeType: string): boolean {
	return mimeType.toLowerCase().startsWith("image/");
}

export function evidenceFileUrl(capId: string, fileId: string): string {
	return `/api/audit/caps/${capId}/attachments/${fileId}`;
}

export function normalizeEvidenceList(
	value: AuditCapEvidenceAttachment[] | null | undefined,
): AuditCapEvidenceAttachment[] {
	if (!Array.isArray(value)) return [];
	return value.filter(
		(item) =>
			item &&
			typeof item.fileId === "string" &&
			typeof item.fileName === "string",
	);
}
