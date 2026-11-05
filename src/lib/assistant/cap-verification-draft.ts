/** Browser draft verification notes before the user saves Mark closed. */

const STORAGE_KEY = "caalm_cap_verification_draft_by_cap";

function readMap(): Record<string, string> {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as unknown;
		if (!parsed || typeof parsed !== "object") return {};
		const out: Record<string, string> = {};
		for (const [key, value] of Object.entries(
			parsed as Record<string, unknown>,
		)) {
			if (typeof value === "string" && value.trim()) {
				out[key] = value;
			}
		}
		return out;
	} catch {
		return {};
	}
}

function writeMap(map: Record<string, string>): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
	} catch {
		// ignore quota / private mode
	}
}

export const CAP_VERIFICATION_DRAFT_EVENT = "caalm-cap-verification-draft";

export function stageCapVerificationDraft(capId: string, note: string): void {
	const id = capId.trim();
	const text = note.trim();
	if (!id || !text) return;
	const map = readMap();
	map[id] = text;
	writeMap(map);
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent(CAP_VERIFICATION_DRAFT_EVENT, {
				detail: { capId: id, note: text },
			}),
		);
	}
}

export function getCapVerificationDraft(capId: string): string | null {
	const id = capId.trim();
	if (!id) return null;
	return readMap()[id] ?? null;
}

export function clearCapVerificationDraft(capId: string): void {
	const id = capId.trim();
	if (!id) return;
	const map = readMap();
	if (!(id in map)) return;
	delete map[id];
	writeMap(map);
	if (typeof window !== "undefined") {
		window.dispatchEvent(
			new CustomEvent(CAP_VERIFICATION_DRAFT_EVENT, {
				detail: { capId: id, note: null },
			}),
		);
	}
}
