import { describe, expect, it } from "vitest";
import { computeSuggestedAsk } from "@/lib/fundraising/ask";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 3.7 suggested ask amount", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.7",
	);

	it("is catalogued as suggested ask", () => {
		expect(task?.title).toMatch(/Suggested ask/i);
	});

	it("returns null ask for zero-gift constituents", () => {
		const result = computeSuggestedAsk({
			gifts: [],
			upgradeReadinessScore: 70,
			capacityBand: 1000,
		});
		expect(result.suggestedAsk).toBeNull();
	});

	it("never suggests below the last posted gift before override", () => {
		const result = computeSuggestedAsk({
			gifts: [
				{
					giftDate: "2026-05-01T00:00:00.000Z",
					amount: 250,
					status: "posted",
				},
				{
					giftDate: "2026-04-01T00:00:00.000Z",
					amount: 100,
					status: "posted",
				},
			],
			upgradeReadinessScore: 0,
			capacityBand: null,
		});
		expect(result.suggestedAsk).toBeGreaterThanOrEqual(250);
	});

	it("caps ask by capacityBand", () => {
		const result = computeSuggestedAsk({
			gifts: [
				{
					giftDate: "2026-05-01T00:00:00.000Z",
					amount: 500,
					status: "posted",
				},
			],
			upgradeReadinessScore: 100,
			capacityBand: 400,
		});
		expect(result.suggestedAsk).toBe(400);
		expect(result.cappedByCapacity).toBe(true);
	});
});
