import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBoardPackCsv, rankCampaignsByRoi } from "@/lib/development";
import { computeDonorMetrics, sumYtdPostedDollars } from "@/lib/development";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.8 board pack export of KPIs", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.8",
	);

	it("is catalogued as board pack export", () => {
		expect(task?.title).toMatch(/Board pack export/i);
	});

	it("CSV KPI rows match metric helpers", () => {
		const rows = [
			{
				constituentId: "a",
				amount: 200,
				giftDate: "2026-04-01",
			},
		];
		const year = 2026;
		const donor = computeDonorMetrics(rows, year);
		const metrics = {
			year,
			ytdDollars: sumYtdPostedDollars(rows, year),
			hasPostedGifts: true,
			...donor,
		};
		const csv = buildBoardPackCsv(metrics, []);
		expect(csv).toMatch(/ytd_dollars,200/);
		expect(csv).toMatch(/unique_donors_ytd,1/);
	});

	it("ranks campaigns by ROI for the export", () => {
		const ranked = rankCampaignsByRoi(
			[
				{
					campaignId: "a",
					name: "A",
					postedTotal: 100,
					campaignCost: 50,
					roi: 1,
				},
				{
					campaignId: "b",
					name: "B",
					postedTotal: 200,
					campaignCost: 100,
					roi: 1,
				},
			],
			1,
		);
		expect(ranked).toHaveLength(1);
	});

	it("does not use audit mock data", () => {
		const route = readFileSync(
			join(process.cwd(), "src/lib/development/board-pack.ts"),
			"utf8",
		);
		expect(route).not.toMatch(/USE_AUDIT_MOCK_DATA/);
		const exportRoute = readFileSync(
			join(process.cwd(), "src/app/api/development/board-pack/export/route.ts"),
			"utf8",
		);
		expect(exportRoute).toMatch(/computeDevelopmentMetrics/);
	});
});
