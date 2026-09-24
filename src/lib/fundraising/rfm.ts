/** Minimal gift fields needed for RFM (posted, non-voiding rows only). */
export type RfmGiftRow = {
	giftDate: string;
	amount: number;
	status: string;
	voidOfId?: string;
};

export type RfmFeatures = {
	recencyDays: number | null;
	frequency: number;
	monetary: number;
	streakMonths: number;
	giftTrend: number;
};

function isCountableGift(gift: RfmGiftRow): boolean {
	if (gift.status === "voided") return false;
	if (gift.voidOfId) return false;
	return gift.amount > 0;
}

function parseDate(iso: string): Date | null {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(d: Date): string {
	return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

/** Days since the most recent countable gift (null when none). */
export function computeRecencyDays(
	gifts: RfmGiftRow[],
	asOf: Date,
): number | null {
	const countable = gifts.filter(isCountableGift);
	if (countable.length === 0) return null;
	let latest: Date | null = null;
	for (const gift of countable) {
		const d = parseDate(gift.giftDate);
		if (!d) continue;
		if (!latest || d > latest) latest = d;
	}
	if (!latest) return null;
	const ms = asOf.getTime() - latest.getTime();
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function computeFrequency(gifts: RfmGiftRow[]): number {
	return gifts.filter(isCountableGift).length;
}

export function computeMonetary(gifts: RfmGiftRow[]): number {
	return gifts
		.filter(isCountableGift)
		.reduce((sum, g) => sum + g.amount, 0);
}

/** Consecutive calendar months (UTC) with at least one countable gift, ending at asOf month. */
export function computeStreakMonths(
	gifts: RfmGiftRow[],
	asOf: Date,
): number {
	const months = new Set<string>();
	for (const gift of gifts.filter(isCountableGift)) {
		const d = parseDate(gift.giftDate);
		if (d) months.add(monthKey(d));
	}
	let streak = 0;
	const cursor = new Date(
		Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1),
	);
	for (;;) {
		if (!months.has(monthKey(cursor))) break;
		streak += 1;
		cursor.setUTCMonth(cursor.getUTCMonth() - 1);
	}
	return streak;
}

/** Recent-window sum minus prior-window sum (positive = giving increased). */
export function computeGiftTrend(
	gifts: RfmGiftRow[],
	asOf: Date,
	windowDays = 90,
): number {
	const countable = gifts.filter(isCountableGift);
	const end = asOf.getTime();
	const recentStart = end - windowDays * 86400000;
	const priorStart = recentStart - windowDays * 86400000;
	let recent = 0;
	let prior = 0;
	for (const gift of countable) {
		const d = parseDate(gift.giftDate);
		if (!d) continue;
		const t = d.getTime();
		if (t >= recentStart && t <= end) recent += gift.amount;
		else if (t >= priorStart && t < recentStart) prior += gift.amount;
	}
	return recent - prior;
}

export function extractRfmFeatures(
	gifts: RfmGiftRow[],
	asOf: Date,
): RfmFeatures {
	return {
		recencyDays: computeRecencyDays(gifts, asOf),
		frequency: computeFrequency(gifts),
		monetary: computeMonetary(gifts),
		streakMonths: computeStreakMonths(gifts, asOf),
		giftTrend: computeGiftTrend(gifts, asOf),
	};
}
