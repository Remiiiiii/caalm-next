import { describe, expect, it } from "vitest";
import type { UIFileDoc } from "@/types/files";
import type { License } from "@/types/licenses";
import type { ExpiryQueueItem } from "./expiry-queue";
import { formatQueueSummaryLine, summarizeExpiryQueue } from "./queue-summary";

function contract(id: string, days: number, amount?: number): ExpiryQueueItem {
	return {
		kind: "contract",
		id,
		days,
		file: { $id: id, amount } as UIFileDoc,
	};
}

function license(id: string, days: number, cost?: number): ExpiryQueueItem {
	return {
		kind: "license",
		id,
		days,
		license: { $id: id, cost } as unknown as License,
	};
}

describe("summarizeExpiryQueue", () => {
	it("counts overdue, within-30 and sums amounts (nulls skipped)", () => {
		const items = [
			contract("a", -3, 24_800),
			contract("b", 12, 175_000),
			license("c", 26, 8_640),
			contract("d", 94, 204_060), // outside 30d window
			license("e", 5), // no amount
		];
		const summary = summarizeExpiryQueue(items);
		expect(summary.total).toBe(5);
		expect(summary.overdue).toBe(1);
		expect(summary.within30).toBe(3);
		expect(summary.amountSum).toBe(24_800 + 175_000 + 8_640 + 204_060);
	});
});

describe("formatQueueSummaryLine", () => {
	it("includes only the parts that have data", () => {
		expect(
			formatQueueSummaryLine({
				total: 3,
				overdue: 1,
				within30: 2,
				amountSum: 412_500,
			}),
		).toBe("1 overdue · 2 within 30 days · $412,500 at stake");

		expect(
			formatQueueSummaryLine({
				total: 2,
				overdue: 0,
				within30: 2,
				amountSum: 0,
			}),
		).toBe("2 within 30 days");
	});
});
