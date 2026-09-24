import { describe, expect, it } from "vitest";
import { buildForm990Worksheet } from "@/lib/funding/form-990/worksheet";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 4.7 990 worksheet CSV export", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.7",
	);

	it("is catalogued as worksheet export", () => {
		expect(task?.title).toMatch(/990 worksheet CSV/i);
	});

	it("maps every tagged line to worksheet or exceptions", () => {
		const lines = [
			{
				sourceType: "gift" as const,
				sourceKey: "gift_cash",
				amount: 100,
				referenceId: "g1",
				referenceLabel: "Gift",
				eventDate: "2026-01-15",
			},
			{
				sourceType: "obligation_kind" as const,
				sourceKey: "payment",
				amount: 50,
				referenceId: "o1",
				referenceLabel: "Payment",
				eventDate: "2026-01-20",
			},
		];
		const result = buildForm990Worksheet({
			lines,
			mappings: [
				{
					sourceType: "gift",
					sourceKey: "gift_cash",
					partIxBucket: "program",
				},
			],
		});
		expect(result.worksheetRows.length + result.exceptions.length).toBe(
			result.taggedLineCount,
		);
		expect(result.exceptions).toHaveLength(1);
		expect(result.exceptions[0]?.sourceKey).toBe("payment");
	});
});
