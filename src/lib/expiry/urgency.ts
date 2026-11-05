/**
 * Urgency tiers for the expiry alert. Both the band's tone and its copy come
 * from `daysRemaining` so the alert always reflects how close (or past) the
 * date is, rather than a fixed decorative color.
 */

/** Critical once the date is a week out or closer. */
export const EXPIRY_URGENT_DAYS = 7;
/** Warning window; beyond this it is merely "scheduled". */
export const EXPIRY_SOON_DAYS = 60;

export type UrgencyTier = "overdue" | "critical" | "soon" | "scheduled";

/** Danger = red, warning = orange, info = blue. */
export type UrgencyTone = "danger" | "warning" | "info";

export function getUrgencyTier(daysRemaining: number): UrgencyTier {
	if (daysRemaining < 0) return "overdue";
	if (daysRemaining <= EXPIRY_URGENT_DAYS) return "critical";
	if (daysRemaining <= EXPIRY_SOON_DAYS) return "soon";
	return "scheduled";
}

const TONE_BY_TIER: Record<UrgencyTier, UrgencyTone> = {
	overdue: "danger",
	critical: "danger",
	soon: "warning",
	scheduled: "info",
};

export function getUrgencyTone(tier: UrgencyTier): UrgencyTone {
	return TONE_BY_TIER[tier];
}

/** "1 day" / "3 days" — never a "(s)" artifact. */
export function pluralDays(n: number): string {
	return `${n} day${n === 1 ? "" : "s"}`;
}

/**
 * The band's primary line. `renewing` licences say "Renews" instead of
 * "Expires"; a past date reads "Expired N days ago".
 */
export function formatUrgencyBandCopy(options: {
	daysRemaining: number;
	dateLabel: string;
	renewing?: boolean;
}): string {
	const { daysRemaining, dateLabel, renewing = false } = options;

	if (daysRemaining < 0) {
		const verb = renewing ? "Renewal lapsed" : "Expired";
		return `${verb} ${pluralDays(Math.abs(daysRemaining))} ago — ${dateLabel}`;
	}

	const verb = renewing ? "Renews" : "Expires";
	if (daysRemaining === 0) {
		return `${verb} today — ${dateLabel}`;
	}
	return `${verb} in ${pluralDays(daysRemaining)} — ${dateLabel}`;
}

/** Fact-cell label + value for the days number in the split body. */
export function getDaysFact(daysRemaining: number): {
	label: string;
	value: number;
} {
	if (daysRemaining < 0) {
		return { label: "Days overdue", value: Math.abs(daysRemaining) };
	}
	return { label: "Days remaining", value: daysRemaining };
}
