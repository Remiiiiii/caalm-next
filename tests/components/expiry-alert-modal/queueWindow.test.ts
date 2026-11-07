import { describe, expect, it } from "vitest";
import { queueWindowStart } from "@/components/expiry-alert-modal/QueueStrip";

describe("queueWindowStart", () => {
	it("stays at 0 while the current item fits in the first 3 rows", () => {
		expect(queueWindowStart(0, 10)).toBe(0);
		expect(queueWindowStart(1, 10)).toBe(0);
		expect(queueWindowStart(2, 10)).toBe(0);
	});

	it("steps forward so item 5 is visible and item 1 scrolls away", () => {
		// currentIndex 4 = "5 / total" → window [2,3,4] = items 3–5
		expect(queueWindowStart(3, 10)).toBe(1);
		expect(queueWindowStart(4, 10)).toBe(2);
	});

	it("steps backward the same way", () => {
		expect(queueWindowStart(4, 10)).toBe(2);
		expect(queueWindowStart(3, 10)).toBe(1);
		expect(queueWindowStart(2, 10)).toBe(0);
	});

	it("clamps at the end of a short or long list", () => {
		expect(queueWindowStart(0, 2)).toBe(0);
		expect(queueWindowStart(9, 10)).toBe(7);
	});
});
