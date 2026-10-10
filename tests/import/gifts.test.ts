import { describe, expect, it } from "vitest";
import { guessGiftImportField } from "@/lib/gifts/import/fields";
import { applyGiftColumnMapping } from "@/lib/gifts/import/parse";

describe("gift import mapping", () => {
	it("guesses gift headers", () => {
		expect(guessGiftImportField("constituent_email")).toBe("constituentEmail");
		expect(guessGiftImportField("Gift Date")).toBe("giftDate");
		expect(guessGiftImportField("fund_code")).toBe("fundCode");
	});

	it("maps valid gift rows and rejects incomplete ones", () => {
		const { valid, errors } = applyGiftColumnMapping(
			[
				{
					email: "pat@example.org",
					amount: "250",
					date: "2026-01-15",
					method: "check",
				},
				{ email: "", amount: "10", date: "2026-01-15", method: "check" },
			],
			{
				email: "constituentEmail",
				amount: "amount",
				date: "giftDate",
				method: "method",
			},
		);
		expect(valid).toHaveLength(1);
		expect(valid[0]?.amount).toBe(250);
		expect(valid[0]?.method).toBe("check");
		expect(errors).toHaveLength(1);
	});
});
