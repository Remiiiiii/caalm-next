import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sumYtdPostedDollars } from "@/lib/development";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.2 YTD dollars stat card", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.2",
	);

	it("is catalogued as YTD dollars stat card", () => {
		expect(task?.title).toMatch(/YTD dollars/i);
	});

	it("sums posted gifts for the year and excludes void rows", () => {
		const total = sumYtdPostedDollars(
			[
				{
					constituentId: "a",
					amount: 100,
					giftDate: "2026-03-01",
				},
				{
					constituentId: "b",
					amount: 50,
					giftDate: "2026-06-01",
					voidOfId: "orig",
				},
				{
					constituentId: "c",
					amount: 25,
					giftDate: "2025-12-31",
				},
			],
			2026,
		);
		expect(total).toBe(100);
	});

	it("renders YTD dollars on the development dashboard", () => {
		const client = readFileSync(
			join(
				process.cwd(),
				"src/app/(root)/dashboard/development/DevelopmentDashboardClient.tsx",
			),
			"utf8",
		);
		expect(client).toMatch(/YTD dollars/);
		expect(client).toMatch(/StatCardIcon/);
	});
});
