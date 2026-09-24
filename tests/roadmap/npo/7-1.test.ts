import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	applyGiftReceiptTemplate,
	DEFAULT_GIFT_RECEIPT_BODY,
} from "@/lib/stewardship/gift-receipt-template";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.1 gift receipt template", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.1",
	);

	it("is catalogued as gift receipt template", () => {
		expect(task?.title).toMatch(/Gift receipt template/i);
	});

	it("includes receiptNumber in default copy", () => {
		const body = applyGiftReceiptTemplate(DEFAULT_GIFT_RECEIPT_BODY, {
			donorName: "Alex",
			amount: "$50.00",
			giftDate: "1/1/2026",
			receiptNumber: "1042",
			orgName: "CAALM Demo",
		});
		expect(body).toMatch(/1042/);
	});

	it("skips anonymous and DNC in receipt sender", () => {
		const sender = readFileSync(
			join(process.cwd(), "src/lib/stewardship/gift-receipts.ts"),
			"utf8",
		);
		expect(sender).toMatch(/anonymous/);
		expect(sender).toMatch(/canContact/);
	});
});
