import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STEWARDSHIP_DIGEST_NOTIFICATION_TYPE } from "@/lib/stewardship/constants";
import { userHasStewardshipDigestEnabled } from "@/lib/stewardship/digest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.7 optional stewardship digest", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.7",
	);

	it("is catalogued as stewardship digest", () => {
		expect(task?.title).toMatch(/stewardship digest/i);
	});

	it("defaults digest preference to off", () => {
		expect(userHasStewardshipDigestEnabled([])).toBe(false);
		expect(userHasStewardshipDigestEnabled(undefined)).toBe(false);
	});

	it("cron and notification type exist", () => {
		expect(STEWARDSHIP_DIGEST_NOTIFICATION_TYPE).toBe("stewardship_digest");
		const route = readFileSync(
			join(process.cwd(), "src/app/api/cron/npo-stewardship-digest/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/isAuthorizedCron/);
	});
});
