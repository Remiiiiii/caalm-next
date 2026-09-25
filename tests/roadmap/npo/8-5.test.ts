import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeCampaignRoi, formatCampaignRoi } from "@/lib/development";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.5 campaign ROI view", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.5",
	);

	it("is catalogued as campaign ROI view", () => {
		expect(task?.title).toMatch(/Campaign ROI view/i);
	});

	it("computes ROI from posted total and cost", () => {
		expect(computeCampaignRoi(150, 100)).toBe(0.5);
	});

	it("returns null for zero cost (display em dash)", () => {
		expect(computeCampaignRoi(100, 0)).toBeNull();
		expect(formatCampaignRoi(null)).toBe("—");
	});

	it("shows ROI on campaign detail", () => {
		const client = readFileSync(
			join(process.cwd(), "src/components/campaigns/CampaignDetailClient.tsx"),
			"utf8",
		);
		expect(client).toMatch(/Campaign ROI/);
		expect(client).toMatch(/formatCampaignRoi/);
	});
});
