import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeLapseRiskScore } from "@/lib/fundraising/scores";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 3.5 explainable lapse-risk score", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.5",
	);

	it("is catalogued as lapse-risk score", () => {
		expect(task?.title).toMatch(/lapse-risk/i);
	});

	it("returns top three weighted features", () => {
		const result = computeLapseRiskScore({
			recencyDays: 400,
			frequency: 2,
			monetary: 500,
			streakMonths: 0,
			giftTrend: -50,
		});
		expect(result.topFeatures.length).toBeLessThanOrEqual(3);
		expect(result.topFeatures.length).toBeGreaterThan(0);
	});

	it("403s without ai.fundraising on intelligence route", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/constituents/[id]/fundraising-intelligence/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/PERMISSIONS\.AI\.FUNDRAISING/);
	});
});
