import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.2 idempotent posted-gift receipt send", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.2",
	);

	it("is catalogued as idempotent receipt send", () => {
		expect(task?.title).toMatch(/Idempotent posted-gift receipt/i);
	});

	it("sends from postGift and tracks receiptSentAt", () => {
		const repo = readFileSync(
			join(process.cwd(), "src/lib/gifts/repository.ts"),
			"utf8",
		);
		const receipts = readFileSync(
			join(process.cwd(), "src/lib/stewardship/gift-receipts.ts"),
			"utf8",
		);
		expect(repo).toMatch(/sendPostedGiftReceiptIfEligible/);
		expect(receipts).toMatch(/receiptSentAt/);
		expect(receipts).toMatch(/already_sent/);
		expect(receipts).toMatch(/not_posted/);
	});
});
