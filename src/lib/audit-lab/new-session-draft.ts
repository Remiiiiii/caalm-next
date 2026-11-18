/**
 * Session draft for the New review simulation wizard.
 * Survives dialog close / refresh until the simulation is scheduled.
 */

const DRAFT_KEY = "caalm-new-simulation-draft";
/** Drafts older than this are dropped instead of restored. */
export const NEW_SESSION_DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type NewSessionDraft = {
	step?: 1 | 2 | 3 | 4;
	title?: string;
	department?: string;
	framework?: string;
	scheduledDate?: string;
	prepDeadlineDate?: string;
	participantIdsCsv?: string;
	roleByUserId?: Record<string, string>;
	ackCheck?: boolean;
	savedAt?: number;
};

export function saveNewSessionDraft(draft: NewSessionDraft): void {
	try {
		sessionStorage.setItem(
			DRAFT_KEY,
			JSON.stringify({ ...draft, savedAt: Date.now() }),
		);
	} catch {
		/* quota / private mode */
	}
}

export function loadNewSessionDraft(): NewSessionDraft | null {
	try {
		const raw = sessionStorage.getItem(DRAFT_KEY);
		if (!raw) return null;
		const draft = JSON.parse(raw) as NewSessionDraft;
		if (
			draft.savedAt &&
			Date.now() - draft.savedAt > NEW_SESSION_DRAFT_MAX_AGE_MS
		) {
			sessionStorage.removeItem(DRAFT_KEY);
			return null;
		}
		return draft;
	} catch {
		return null;
	}
}

export function clearNewSessionDraft(): void {
	try {
		sessionStorage.removeItem(DRAFT_KEY);
	} catch {
		/* ignore */
	}
}

/** True when the user has filled enough that a restore is worth it. */
export function newSessionDraftHasContent(draft: NewSessionDraft): boolean {
	return Boolean(
		draft.title?.trim() ||
			draft.department?.trim() ||
			(draft.framework && draft.framework !== "SOC 2") ||
			draft.scheduledDate ||
			draft.prepDeadlineDate ||
			draft.participantIdsCsv?.trim() ||
			(draft.step && draft.step > 1),
	);
}
