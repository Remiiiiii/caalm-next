import { CapEvidenceValidationError } from "./cap-evidence";

export { CapEvidenceValidationError };

export const INTERVIEW_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/webp",
	"image/gif",
	"application/pdf",
]);

/** Same limits/allowlist as CAP evidence (`assertCapEvidenceFile`) — no new rules invented for this flow. */
export function assertInterviewEvidenceFile(file: File): void {
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
	if (file.size > INTERVIEW_EVIDENCE_MAX_BYTES) {
		throw new CapEvidenceValidationError("Each file must be 10 MB or smaller.");
	}
}
