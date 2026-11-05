import { stageCapVerificationDraft } from "@/lib/assistant/cap-verification-draft";

export type OpenCloseCapPayload = {
	capId: string;
	findingId: string;
	documentId: string;
	verificationNote: string;
};

export type AssistantClientAction =
	| { type: "navigate"; href: string }
	| ({ type: "open_close_cap" } & OpenCloseCapPayload);

export const OPEN_CLOSE_CAP_EVENT = "caalm-open-close-cap";

export function dispatchOpenCloseCap(payload: OpenCloseCapPayload): void {
	const capId = payload.capId.trim();
	const findingId = payload.findingId.trim();
	const documentId = payload.documentId.trim();
	const verificationNote = payload.verificationNote.trim();
	if (!capId || !findingId || !documentId) return;
	if (verificationNote) {
		stageCapVerificationDraft(capId, verificationNote);
	}
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent(OPEN_CLOSE_CAP_EVENT, {
			detail: {
				capId,
				findingId,
				documentId,
				verificationNote,
			} satisfies OpenCloseCapPayload,
		}),
	);
}
