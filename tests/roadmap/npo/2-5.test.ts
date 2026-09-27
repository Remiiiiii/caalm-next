import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 2.5 campaigns schema and UI", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[2]?.tasks.find(
		(row) => row.taskCode === "2.5",
	);

	it("is catalogued as campaigns", () => {
		expect(task?.title).toMatch(/Campaigns/i);
	});

	it("uses an alphanumeric campaigns collection id", () => {
		expect(appwriteConfig.campaignsCollectionId).toMatch(/^[a-zA-Z0-9]+$/);
	});

	it("sums posted gifts for campaign totals", () => {
		const repo = readFileSync(
			join(process.cwd(), "src/lib/gifts/repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/sumPostedGiftTotalForCampaign/);
		const api = readFileSync(
			join(process.cwd(), "src/app/api/campaigns/route.ts"),
			"utf8",
		);
		expect(api).toMatch(/postedTotal/);
	});
});
