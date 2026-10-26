const DRAFT_KEY = "caalm-ticket-form-draft";
/** Drafts older than this are dropped instead of restored. */
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type TicketFormDraft = {
	lane?: string;
	title?: string;
	category?: string;
	affectedModule?: string;
	description?: string;
	problemPageUrl?: string;
	impact?: string;
	urgency?: string;
	helpPriority?: string;
	reproSteps?: string[];
	expected?: string;
	actual?: string;
	os?: string;
	environment?: string;
	searchedExisting?: boolean;
	isBug?: boolean;
	/** Set on save; drafts saved before this field existed have none. */
	savedAt?: number;
};

export function saveTicketFormDraft(draft: TicketFormDraft): void {
	try {
		sessionStorage.setItem(
			DRAFT_KEY,
			JSON.stringify({ ...draft, savedAt: Date.now() }),
		);
	} catch {
		/* quota */
	}
}

export function loadTicketFormDraft(): TicketFormDraft | null {
	try {
		const raw = sessionStorage.getItem(DRAFT_KEY);
		if (!raw) return null;
		const draft = JSON.parse(raw) as TicketFormDraft;
		if (draft.savedAt && Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
			sessionStorage.removeItem(DRAFT_KEY);
			return null;
		}
		return draft;
	} catch {
		return null;
	}
}

export function clearTicketFormDraft(): void {
	try {
		sessionStorage.removeItem(DRAFT_KEY);
	} catch {
		/* ignore */
	}
}

/** True when the user has typed or picked something worth keeping. */
export function ticketFormDraftHasContent(draft: TicketFormDraft): boolean {
	return Boolean(
		draft.title?.trim() ||
			draft.category ||
			draft.description?.trim() ||
			draft.expected?.trim() ||
			draft.actual?.trim() ||
			draft.impact ||
			draft.urgency ||
			draft.reproSteps?.some((step) => step.trim()),
	);
}

const PENDING_RECORD_KEY = "caalm-pending-screen-record";

export type PendingScreenRecord = {
	problemPageUrl: string;
	path: string;
	withMic: boolean;
};

export function savePendingScreenRecord(payload: PendingScreenRecord): void {
	sessionStorage.setItem(PENDING_RECORD_KEY, JSON.stringify(payload));
}

export function consumePendingScreenRecord(
	currentPath: string,
): PendingScreenRecord | null {
	try {
		const raw = sessionStorage.getItem(PENDING_RECORD_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as PendingScreenRecord;
		if (parsed.path !== currentPath) return null;
		sessionStorage.removeItem(PENDING_RECORD_KEY);
		return parsed;
	} catch {
		return null;
	}
}

export function clearPendingScreenRecord(): void {
	sessionStorage.removeItem(PENDING_RECORD_KEY);
}
