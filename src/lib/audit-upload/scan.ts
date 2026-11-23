/**
 * shortcut: no real AV engine wired here — this only re-validates the file's
 * byte signature against its claimed mime type, it does not scan content for
 * malware. Upgrade by wiring Appwrite bucket antivirus (confirm it's actually
 * enabled first) or a third-party scan API before this handles untrusted
 * non-practice data.
 */

const SIGNATURE_CHECKS: Record<string, (bytes: Buffer) => boolean> = {
	"image/png": (b) =>
		b.length >= 8 &&
		b[0] === 0x89 &&
		b[1] === 0x50 &&
		b[2] === 0x4e &&
		b[3] === 0x47,
	"image/jpeg": (b) =>
		b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
	"image/jpg": (b) =>
		b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
	"image/gif": (b) =>
		b.length >= 4 && b.subarray(0, 4).toString("ascii") === "GIF8",
	"image/webp": (b) =>
		b.length >= 12 &&
		b.subarray(0, 4).toString("ascii") === "RIFF" &&
		b.subarray(8, 12).toString("ascii") === "WEBP",
	"application/pdf": (b) =>
		b.length >= 4 && b.subarray(0, 4).toString("ascii") === "%PDF",
};

/** Mandatory, non-skippable scan step — always holds `scanning` for this long even when the signature check is instant. */
const MIN_SCAN_MS = 1500;

export async function scanAttachmentFile(
	bytes: Buffer,
	mimeType: string,
): Promise<{ ok: boolean; reason?: string }> {
	const check = SIGNATURE_CHECKS[mimeType.toLowerCase()];
	const signatureOk = check ? check(bytes) : false;
	await new Promise((resolve) => setTimeout(resolve, MIN_SCAN_MS));
	if (!signatureOk) {
		return { ok: false, reason: "Failed compliance scan" };
	}
	return { ok: true };
}
