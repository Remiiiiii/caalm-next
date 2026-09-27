/** Default NBA dismiss hide window (days). Org override later. */
export const NBA_DISMISS_COOLDOWN_DAYS = 14;

/** Thank-you NBA when no thank interaction within this many days. */
export const THANK_INTERACTION_LOOKBACK_DAYS = 7;

/** Notification type key — opt-in via notification settings (default off). */
export const STEWARDSHIP_DIGEST_NOTIFICATION_TYPE = "stewardship_digest";

/** Posted gifts at or above this amount may trigger thank NBA (env override). */
export function thankYouThreshold(): number {
	const raw = process.env.STEWARDSHIP_THANK_YOU_THRESHOLD;
	if (raw == null || raw === "") return 0;
	const n = Number(raw);
	return Number.isFinite(n) && n >= 0 ? n : 0;
}
