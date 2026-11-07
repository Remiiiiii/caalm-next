/**
 * Which action buttons an expiry alert shows, and in what order, based on the
 * record kind and whether it is already overdue. This removes two old defects:
 * a "Snooze" button on licenses that only dismissed for the session, and a
 * snooze on contracts already past their date.
 *
 * Stack order is always: primary -> secondary -> divider -> deferral ->
 * destructive. There is exactly one primary.
 */

/** Far window: snooze until this many days before expiry. */
export const EXPIRY_SNOOZE_RESUME_BEFORE_EXPIRY_DAYS = 10;
/** At/above this many days left, use the far-window snooze. */
export const EXPIRY_SNOOZE_FAR_WINDOW_DAYS = 30;
/** Mid window (~11–29 days left): short default snooze. */
export const EXPIRY_SNOOZE_MID_DEFAULT_DAYS = 5;

/**
 * @deprecated Use {@link resolveContractSnoozeDays} — fixed 30 was misleading
 * when fewer days remained.
 */
export const EXPIRY_ALERT_SNOOZE_DAYS = EXPIRY_SNOOZE_FAR_WINDOW_DAYS;

/**
 * How many calendar days to snooze a contract alert.
 * Never past 1 day before expiry. Null = snooze not offered.
 *
 * - ≥30 days left → quiet until 10 days before expiry
 * - 11–29 days left → short snooze (up to 5 days)
 * - 2–10 days left → until the day before expiry
 * - ≤1 day left → no snooze
 */
export function resolveContractSnoozeDays(
	daysRemaining: number,
): number | null {
	if (!Number.isFinite(daysRemaining) || daysRemaining <= 1) return null;

	if (daysRemaining >= EXPIRY_SNOOZE_FAR_WINDOW_DAYS) {
		return daysRemaining - EXPIRY_SNOOZE_RESUME_BEFORE_EXPIRY_DAYS;
	}

	if (daysRemaining > 10) {
		return Math.min(EXPIRY_SNOOZE_MID_DEFAULT_DAYS, daysRemaining - 1);
	}

	return daysRemaining - 1;
}

function clampSnoozeDays(
	requested: number,
	daysRemaining: number,
): number | null {
	if (daysRemaining <= 1 || requested < 1) return null;
	return Math.min(requested, daysRemaining - 1);
}

function snoozeLabel(days: number): string {
	return days === 1 ? "Snooze 1 day" : `Snooze ${days} days`;
}

export type ExpiryActionId =
	| "renew"
	| "view"
	| "snooze"
	| "dismiss"
	| "letExpire"
	| "markInactive";

export type ExpiryActionButton = {
	id: ExpiryActionId;
	label: string;
};

export type ExpiryActionMatrix = {
	primary: ExpiryActionButton;
	/** View details. */
	secondary: ExpiryActionButton;
	/** Snooze (contract, not overdue) or Dismiss for now (license). */
	deferral: ExpiryActionButton | null;
	/** Let expire / Mark inactive — always opens a confirm step. */
	destructive: ExpiryActionButton | null;
	/** Muted note explaining any absent or consequential action. */
	note: string;
};

export function getExpiryActions(options: {
	kind: "contract" | "license";
	daysRemaining: number;
	/** Optional override; still clamped to day-before-expiry. */
	snoozeDays?: number;
}): ExpiryActionMatrix {
	const { kind, daysRemaining, snoozeDays } = options;

	const secondary: ExpiryActionButton = { id: "view", label: "More details" };

	if (kind === "license") {
		return {
			primary: { id: "renew", label: "Renew License" },
			secondary,
			deferral: { id: "dismiss", label: "Dismiss for now" },
			destructive: null,
			note: "A license can't be snoozed by date or marked inactive — Dismiss for now hides it until your next session.",
		};
	}

	const primary: ExpiryActionButton = { id: "renew", label: "Renew Contract" };
	const isOverdue = daysRemaining < 0;

	if (isOverdue) {
		return {
			primary,
			secondary,
			deferral: null,
			destructive: { id: "markInactive", label: "Mark Inactive…" },
			note: "Already past its date, so it can't be snoozed. Mark inactive closes it out and you'll be asked to confirm.",
		};
	}

	const resolved =
		snoozeDays !== undefined
			? clampSnoozeDays(snoozeDays, daysRemaining)
			: resolveContractSnoozeDays(daysRemaining);

	if (resolved == null) {
		return {
			primary,
			secondary,
			deferral: null,
			destructive: { id: "letExpire", label: "Let Expire…" },
			note: "Too close to expiry to snooze — renew, check more details, or let it expire.",
		};
	}

	return {
		primary,
		secondary,
		deferral: { id: "snooze", label: snoozeLabel(resolved) },
		destructive: { id: "letExpire", label: "Let Expire…" },
		note: "Let expire marks this contract inactive. You'll be asked to confirm.",
	};
}
