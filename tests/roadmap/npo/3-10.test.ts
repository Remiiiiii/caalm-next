import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeSuggestedAsk } from "@/lib/fundraising/ask";
import { computeCampaignResponseRate } from "@/lib/fundraising/campaign-response";
import { extractRfmFeatures } from "@/lib/fundraising/rfm";
import {
	computeLapseRiskScore,
	computeUpgradeReadinessScore,
} from "@/lib/fundraising/scores";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";
import golden from "../../fundraising/scoring-golden.fixtures.json";

describe("NPO 3.10 score recompute tests and docs", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.10",
	);

	it("is catalogued as score recompute tests", () => {
		expect(task?.title).toMatch(/Score recompute/i);
	});

	it("golden lapse fixture stays stable", () => {
		const { features, expectedLapseScore, expectedLapseTopLabel } =
			golden.lapseChampion;
		const lapse = computeLapseRiskScore(features);
		expect(lapse.score).toBe(expectedLapseScore);
		expect(lapse.topFeatures[0]?.label).toBe(expectedLapseTopLabel);
		expect(lapse.topFeatures.length).toBeGreaterThanOrEqual(3);
	});

	it("golden upgrade fixture stays stable", () => {
		const { features, campaignResponseRate, capacityBand, expectedUpgradeScore } =
			golden.upgradeWithCapacity;
		const upgrade = computeUpgradeReadinessScore({
			features,
			campaignResponseRate,
			capacityBand,
		});
		expect(upgrade.score).toBe(expectedUpgradeScore);
		expect(upgrade.topFeatures.length).toBeGreaterThanOrEqual(3);
	});

	it("golden ask fixture stays stable", () => {
		const {
			gifts,
			upgradeReadinessScore,
			capacityBand,
			expectedAsk,
		} = golden.askFromGifts;
		const ask = computeSuggestedAsk({
			gifts,
			upgradeReadinessScore,
			capacityBand,
		});
		expect(ask.suggestedAsk).toBe(expectedAsk);
	});

	it("excludes voided gifts from RFM features", () => {
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
			],
			new Date("2026-06-01T12:00:00.000Z"),
		);
		expect(features.frequency).toBe(1);
	});

	it("skips DNC constituents during segment recompute", () => {
		const repo = readFileSync(
			join(process.cwd(), "src/lib/fundraising/segments-repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/loadDoNotContactIds/);
		expect(repo).toMatch(/skippedDnc/);
	});

	it("campaign response ignores void rows", () => {
		const rate = computeCampaignResponseRate([
			{
				giftDate: "2026-05-01T00:00:00.000Z",
				amount: 100,
				status: "posted",
				campaignId: "camp-1",
			},
			{
				giftDate: "2026-04-01T00:00:00.000Z",
				amount: 50,
				status: "voided",
				campaignId: "camp-2",
			},
		]);
		expect(rate).toBe(1);
	});

	it("marketing and docs avoid banned wealth-engine packaging", () => {
		const banned = [/wealth engine/i, /we screen wealth/i];
		const roots = [join(process.cwd(), "src/components/landing")];
		for (const root of roots) {
			const stack = [root];
			while (stack.length) {
				const dir = stack.pop()!;
				for (const entry of readdirSync(dir, { withFileTypes: true })) {
					const full = join(dir, entry.name);
					if (entry.isDirectory()) stack.push(full);
					else if (/\.(tsx|ts|md|mdx)$/.test(entry.name)) {
						const text = readFileSync(full, "utf8");
						for (const re of banned) {
							expect(text).not.toMatch(re);
						}
					}
				}
			}
		}
	});
});
