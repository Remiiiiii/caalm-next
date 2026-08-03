/**
 * Shared date helpers and auto-renew term math for contracts and licenses.
 */

export function parseDateOnly(raw?: string | null): Date | null {
	if (!raw || typeof raw !== "string") return null;
	const dateStr = raw.split("T")[0];
	const [year, month, day] = dateStr.split("-").map(Number);
	if (!year || !month || !day) return null;
	const d = new Date(year, month - 1, day);
	d.setHours(0, 0, 0, 0);
	if (Number.isNaN(d.getTime())) return null;
	return d;
}

export function toDateOnlyString(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function daysUntilExpiry(
	expiryRaw: string,
	now: Date = new Date(),
): number {
	const expiry = parseDateOnly(expiryRaw);
	if (!expiry) return Number.NaN;
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	const timeDiff = expiry.getTime() - today.getTime();
	return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
}

export function isExpiryReachedOrPassed(
	expiryRaw: string,
	now: Date = new Date(),
): boolean {
	const days = daysUntilExpiry(expiryRaw, now);
	return !Number.isNaN(days) && days <= 0;
}

/** Whole days in the current term (start → expiry). Returns null if invalid. */
export function computeTermDays(
	startRaw?: string | null,
	expiryRaw?: string | null,
): number | null {
	const start = parseDateOnly(startRaw);
	const expiry = parseDateOnly(expiryRaw);
	if (!start || !expiry) return null;
	const diff = Math.floor(
		(expiry.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
	);
	if (diff <= 0) return null;
	return diff;
}

/**
 * Next expiry: same term length as start→expiry, else +1 year from current expiry.
 */
export function computeNextExpiryDate({
	startDate,
	expiryDate,
}: {
	startDate?: string | null;
	expiryDate: string;
}): string {
	const expiry = parseDateOnly(expiryDate);
	if (!expiry) {
		throw new Error(`Invalid expiry date: ${expiryDate}`);
	}

	const termDays = computeTermDays(startDate, expiryDate);
	const next = new Date(expiry);
	if (termDays != null) {
		next.setDate(next.getDate() + termDays);
	} else {
		next.setFullYear(next.getFullYear() + 1);
	}
	return toDateOnlyString(next);
}

export function shouldAutoRenew(record: {
	autoRenew?: boolean | null;
}): boolean {
	return record.autoRenew === true;
}
