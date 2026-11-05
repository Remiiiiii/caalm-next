/**
 * Totals shown in the queue strip header: how many are overdue, how many fall
 * inside the 30-day window, and the money at stake across the whole queue.
 */

import { getItemAmount } from "./expiry-item-view";
import { EXPIRY_WINDOW_DAYS, type ExpiryQueueItem } from "./expiry-queue";

export type ExpiryQueueSummary = {
	total: number;
	overdue: number;
	within30: number;
	amountSum: number;
};

export function summarizeExpiryQueue(
	items: ExpiryQueueItem[],
): ExpiryQueueSummary {
	let overdue = 0;
	let within30 = 0;
	let amountSum = 0;

	for (const item of items) {
		if (item.days < 0) overdue += 1;
		else if (item.days <= EXPIRY_WINDOW_DAYS) within30 += 1;

		const amount = getItemAmount(item);
		if (amount !== null) amountSum += amount;
	}

	return { total: items.length, overdue, within30, amountSum };
}

/** "1 overdue · 2 within 30 days · $412,500 at stake" (parts with data only). */
export function formatQueueSummaryLine(summary: ExpiryQueueSummary): string {
	const parts: string[] = [];
	if (summary.overdue > 0) parts.push(`${summary.overdue} overdue`);
	if (summary.within30 > 0) parts.push(`${summary.within30} within 30 days`);
	if (summary.amountSum > 0) {
		parts.push(
			`$${summary.amountSum.toLocaleString(undefined, {
				maximumFractionDigits: 0,
			})} at stake`,
		);
	}
	return parts.join(" · ");
}
