import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 3.3 lifecycle segments and cron", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.3",
	);

	it("is catalogued as lifecycle storage", () => {
		expect(task?.title).toMatch(/Lifecycle segment/i);
	});

	it("uses alphanumeric constituent_segments id", () => {
		expect(appwriteConfig.constituentSegmentsCollectionId).toMatch(
/^[a-zA-Z0-9]+$/,
		);
	});

	it("gates cron with Bearer secret", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/cron/npo-rfm/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/isAuthorizedCron/);
		expect(route).toMatch(/401/);
	});
});
