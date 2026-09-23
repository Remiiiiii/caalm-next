import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { householdGiftTotals } from "@/lib/gifts/household-totals";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.9 soft credits", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.9",
	);

	it("is catalogued as soft credits", () => {
		expect(task?.title).toMatch(/Soft credit/i);
	});

	it("does not double-count cash in household totals", () => {
		const totals = householdGiftTotals({
			hardGiftAmount: 100,
			softCreditAmounts: [100, 50],
		});
		expect(totals.cashTotal).toBe(100);
		expect(totals.recognitionTotal).toBe(250);
	});

	it("creates soft credits on post without changing receipt flow", () => {
		const repo = readFileSync(
			join(process.cwd(), "src/lib/gifts/repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/createSoftCreditsForPostedGift/);
		const soft = readFileSync(
			join(process.cwd(), "src/lib/gifts/soft-credits.ts"),
			"utf8",
		);
		expect(soft).not.toMatch(/allocateReceiptNumber/);
	});
});
