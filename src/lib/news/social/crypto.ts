import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";

function encryptionKey(): Buffer {
	const secret =
		process.env.NEWS_OAUTH_ENCRYPTION_KEY ||
		process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY ||
		process.env.STEP_UP_SECRET ||
		"";
	if (!secret) {
		throw new Error("NEWS_OAUTH_ENCRYPTION_KEY is not configured");
	}
	return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
	const encrypted = Buffer.concat([
		cipher.update(plain, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string): string {
	const [version, ivB64, tagB64, dataB64] = payload.split(":");
	if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) {
		throw new Error("Invalid encrypted secret");
	}
	const decipher = createDecipheriv(
		"aes-256-gcm",
		encryptionKey(),
		Buffer.from(ivB64, "base64url"),
	);
	decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
	const decrypted = Buffer.concat([
		decipher.update(Buffer.from(dataB64, "base64url")),
		decipher.final(),
	]);
	return decrypted.toString("utf8");
}
