import type {
	EsignEnvelopeStatus,
	EsignRecipient,
	EsignRecipientStatus,
} from "./types";

const SIGNER_ROLES = new Set(["signer"]);

export function isTerminalEnvelopeStatus(status: EsignEnvelopeStatus): boolean {
	return (
		status === "completed" ||
		status === "declined" ||
		status === "voided" ||
		status === "expired"
	);
}

export function deriveEnvelopeStatus(
	recipients: EsignRecipient[],
	previous: EsignEnvelopeStatus = "draft",
): EsignEnvelopeStatus {
	if (previous === "voided" || previous === "expired") return previous;

	const signers = recipients.filter((r) => SIGNER_ROLES.has(r.role));
	if (signers.length === 0) return previous === "draft" ? "draft" : previous;

	if (signers.some((r) => r.status === "declined")) return "declined";

	const signedCount = signers.filter((r) => r.status === "signed").length;
	if (signedCount === signers.length) return "completed";
	if (signedCount > 0) return "partially_signed";
	if (signers.some((r) => r.status === "viewed")) return "viewed";
	if (signers.some((r) => r.status === "sent") || previous === "sent") {
		return "sent";
	}
	return previous;
}

export function applyRecipientTransition(
	current: EsignRecipientStatus,
	next: EsignRecipientStatus,
): EsignRecipientStatus {
	if (current === "signed" || current === "declined") return current;
	const rank: Record<EsignRecipientStatus, number> = {
		pending: 0,
		sent: 1,
		viewed: 2,
		signed: 3,
		declined: 3,
	};
	return rank[next] >= rank[current] ? next : current;
}
