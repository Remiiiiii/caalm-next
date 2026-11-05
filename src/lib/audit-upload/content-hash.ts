import { createHash } from "node:crypto";

export function hashAuditContent(bytes: ArrayBuffer | Buffer | Uint8Array): string {
	const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
	return createHash("sha256").update(buffer).digest("hex");
}
