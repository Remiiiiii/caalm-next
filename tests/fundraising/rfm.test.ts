import { describe, expect, it } from "vitest";
import { extractRfmFeatures } from "@/lib/fundraising/rfm";

describe("RFM feature extraction", () => {
	const asOf = new Date("2026-06-01T12:00:00.000Z");

	it("ignores voided and reversing gifts", () => {
		const features = extractRfmFeatures(
			[
				{
					giftDate: "2026-05-01T00:00:00.000Z",
					amount: 100,
					status: "posted",
				},
				{
					giftDate: "2026-04-01T00:00:00.000Z",
					amount: 50,
					status: "voided",
				},
				{
					giftDate: "2026-03-01T00:00:00.000Z",
					amount: -100,
					status: "posted",
					voidOfId: "abc",
				},
			],
			asOf,
		);
		expect(features.frequency).toBe(1);
		expect(features.monetary).toBe(100);
	});

	it("uses injected asOf instead of Date.now()", () => {
		const features = extractRfmFeatures(
			[
				{
					giftDate: "2026-05-15T00:00:00.000Z",
					amount: 25,
					status: "posted",
				},
			],
			asOf,
		);
		expect(features.recencyDays).toBe(17);
	});
});
