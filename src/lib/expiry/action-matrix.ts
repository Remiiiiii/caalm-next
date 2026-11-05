/**
 * Which action buttons an expiry alert shows, and in what order, based on the
 * record kind and whether it is already overdue. This removes two old defects:
 * a "Snooze" button on licenses that only dismissed for the session, and a
 * snooze on contracts already past their date.
 *
 * Stack order is always: primary -> secondary -> divider -> deferral ->
 * destructive. There is exactly one primary.
 */

export const EXPIRY_ALERT_SNOOZE_DAYS = 30;

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
	snoozeDays?: number;
}): ExpiryActionMatrix {
	const {
		kind,
		daysRemaining,
		snoozeDays = EXPIRY_ALERT_SNOOZE_DAYS,
	} = options;

	const secondary: ExpiryActionButton = { id: "view", label: "View Details" };

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

	return {
		primary,
		secondary,
		deferral: { id: "snooze", label: `Snooze ${snoozeDays} days` },
		destructive: { id: "letExpire", label: "Let Expire…" },
		note: "Let expire marks this contract inactive. You'll be asked to confirm.",
	};
}
