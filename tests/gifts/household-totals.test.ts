import { describe, expect, it } from "vitest";
import { householdGiftTotals } from "@/lib/gifts/household-totals";

describe("householdGiftTotals", () => {
	it("counts cash once on the hard credit only", () => {
		const { cashTotal, recognitionTotal } = householdGiftTotals({
			hardGiftAmount: 250,
			softCreditAmounts: [250],
		});
		expect(cashTotal).toBe(250);
		expect(recognitionTotal).toBe(500);
	});
});
