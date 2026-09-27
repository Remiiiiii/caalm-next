import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.10 dashboard permission matrix tests", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.10",
	);

	it("is catalogued as dashboard permission matrix tests", () => {
		expect(task?.title).toMatch(/Dashboard permission matrix/i);
	});

	it("does not require ai.fundraising for YTD dollars", () => {
		const metricsRoute = readFileSync(
			join(process.cwd(), "src/app/api/development/metrics/route.ts"),
			"utf8",
		);
		expect(metricsRoute).toMatch(/CONSTITUENTS\.VIEW/);
		expect(metricsRoute).not.toMatch(/AI\.FUNDRAISING/);

		const page = readFileSync(
			join(process.cwd(), "src/app/(root)/dashboard/development/page.tsx"),
			"utf8",
		);
		expect(page).toMatch(/CONSTITUENTS\.VIEW/);
		expect(page).not.toMatch(/AI\.FUNDRAISING/);
	});

	it("requires funding.view for funder snapshot download", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/funding/grants/[contractId]/funder-snapshot/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/FUNDING\.VIEW/);
		expect(route).not.toMatch(/Super Admin/i);
	});

	it("gates wealth intelligence on ai.fundraising only", () => {
		const tab = readFileSync(
			join(
				process.cwd(),
				"src/components/constituents/FundraisingIntelligenceTab.tsx",
			),
			"utf8",
		);
		expect(tab).toMatch(/ai\.fundraising/);
		expect(tab).not.toMatch(/Super Admin/i);
	});
});
