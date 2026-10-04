import { describe, expect, it } from "vitest";
import {
	aggregateShareAttributionMetrics,
	hasShareAttribution,
	matchCampaignIdFromShareTag,
	parseGiveShareAttribution,
	SHARE_FIELD_MAX,
} from "@/lib/give/attribution";

describe("parseGiveShareAttribution", () => {
	it("maps utm query params", () => {
		const params = new URLSearchParams(
			"utm_source=copy&utm_medium=caalm&utm_campaign=spring-appeal",
		);
		expect(parseGiveShareAttribution(params)).toEqual({
			shareSource: "copy",
			shareMedium: "caalm",
			shareCampaign: "spring-appeal",
		});
	});

	it("prefers share* body keys and trims", () => {
		expect(
			parseGiveShareAttribution({
				shareSource: " email ",
				utm_source: "copy",
				shareMedium: "caalm",
				shareCampaign: "  ",
			}),
		).toEqual({
			shareSource: "email",
			shareMedium: "caalm",
			shareCampaign: undefined,
		});
	});

	it("clips overlong fields", () => {
		const long = "x".repeat(SHARE_FIELD_MAX + 20);
		expect(parseGiveShareAttribution({ utm_source: long }).shareSource).toHaveLength(
			SHARE_FIELD_MAX,
		);
	});

	it("hasShareAttribution is false when empty", () => {
		expect(hasShareAttribution({})).toBe(false);
		expect(hasShareAttribution({ shareSource: "qr" })).toBe(true);
	});
});

describe("matchCampaignIdFromShareTag", () => {
	const campaigns = [
		{ $id: "c1", name: "Spring Appeal" },
		{ $id: "c2", name: "Fall Gala" },
	];

	it("returns the id when exactly one name slug matches", () => {
		expect(matchCampaignIdFromShareTag(campaigns, "spring-appeal")).toBe("c1");
	});

	it("returns undefined for zero matches", () => {
		expect(matchCampaignIdFromShareTag(campaigns, "winter")).toBeUndefined();
	});

	it("returns undefined when two names slug to the same tag", () => {
		expect(
			matchCampaignIdFromShareTag(
				[
					{ $id: "a", name: "Spring Appeal" },
					{ $id: "b", name: "spring-appeal" },
				],
				"spring-appeal",
			),
		).toBeUndefined();
	});
});

describe("aggregateShareAttributionMetrics", () => {
	it("rolls visits and gifts by campaign tag and source", () => {
		const { buckets, totals } = aggregateShareAttributionMetrics({
			visits: [
				{ shareCampaign: "spring", shareSource: "copy" },
				{ shareCampaign: "spring", shareSource: "email" },
				{ shareCampaign: "spring", shareSource: "qr" },
			],
			gifts: [
				{ shareCampaign: "spring", shareSource: "email", amount: 50, campaignName: "Spring Appeal" },
				{ shareCampaign: "spring", shareSource: "qr", amount: 25 },
			],
		});

		expect(totals.visitCount).toBe(3);
		expect(totals.giftCount).toBe(2);
		expect(totals.giftTotal).toBe(75);
		expect(totals.conversionRate).toBeCloseTo(2 / 3);

		expect(buckets).toHaveLength(1);
		expect(buckets[0]?.shareCampaign).toBe("spring");
		expect(buckets[0]?.linkedCampaignName).toBe("Spring Appeal");
		expect(buckets[0]?.sources.map((s) => s.shareSource).sort()).toEqual([
			"copy",
			"email",
			"qr",
		]);
	});
});
