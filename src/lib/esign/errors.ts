export const ESIGN_ERROR_CODES = [
	"ESIGN-403",
	"ESIGN-404",
	"ESIGN-409",
	"ESIGN-410",
] as const;

export type EsignErrorCode = (typeof ESIGN_ERROR_CODES)[number];

const STATUS_BY_CODE: Record<EsignErrorCode, number> = {
	"ESIGN-403": 403,
	"ESIGN-404": 404,
	"ESIGN-409": 409,
	"ESIGN-410": 410,
};

export class EsignLinkError extends Error {
	readonly code: EsignErrorCode;
	readonly status: number;

	constructor(code: EsignErrorCode, message: string) {
		super(message);
		this.name = "EsignLinkError";
		this.code = code;
		this.status = STATUS_BY_CODE[code];
	}
}

export function isEsignErrorCode(value: unknown): value is EsignErrorCode {
	return (
		typeof value === "string" &&
		(ESIGN_ERROR_CODES as readonly string[]).includes(value)
	);
}

export function esignErrorFromMessage(message: string): {
	code: EsignErrorCode;
	error: string;
} {
	const lower = message.toLowerCase();
	if (lower.includes("expired")) {
		return { code: "ESIGN-410", error: message };
	}
	if (
		lower.includes("no longer valid") ||
		lower.includes("voided") ||
		lower.includes("declined")
	) {
		return { code: "ESIGN-409", error: message };
	}
	if (lower.includes("already signed")) {
		return { code: "ESIGN-403", error: message };
	}
	return { code: "ESIGN-404", error: message };
}

export function explanationForEsignCode(code: EsignErrorCode | null): string {
	switch (code) {
		case "ESIGN-410":
			return "This signing link expired. Ask the sender to send a new invite.";
		case "ESIGN-409":
			return "This signing link is no longer valid. The envelope was voided or declined.";
		case "ESIGN-403":
			return "This document was already signed with this link.";
		case "ESIGN-404":
		default:
			return "This signing link is invalid or was tampered with. Check the address or ask the sender for a new invite.";
	}
}
