import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.7 event campaign join", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.7",
	);

	it("is catalogued as event campaign join", () => {
		expect(task?.title).toMatch(/Event campaign join/i);
	});

	it("validates campaignId belongs to the org", () => {
		const mod = readFileSync(
			join(process.cwd(), "src/lib/events/event-campaign.ts"),
			"utf8",
		);
		expect(mod).toMatch(/getCampaignById/);
		expect(mod).toMatch(/Campaign not found in this organization/);
	});

	it("exposes campaignId on calendar event edit", () => {
		const calendar = readFileSync(
			join(process.cwd(), "src/components/OutlookStyleCalendar.tsx"),
			"utf8",
		);
		expect(calendar).toMatch(/Fundraising campaign/);
		expect(calendar).toMatch(/campaignId/);
	});
});
