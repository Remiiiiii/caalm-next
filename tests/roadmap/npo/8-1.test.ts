import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.1 development dashboard route", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.1",
	);

	it("is catalogued as development dashboard route", () => {
		expect(task?.title).toMatch(/Development dashboard route/i);
	});

	it("gates the page with constituents.view", () => {
		const page = readFileSync(
			join(
				process.cwd(),
				"src/app/(root)/dashboard/development/page.tsx",
			),
			"utf8",
		);
		expect(page).toMatch(/requirePagePermission/);
		expect(page).toMatch(/CONSTITUENTS\.VIEW/);
		expect(page).toMatch(/h1 capitalize sidebar-gradient-text/);
	});

	it("gates the metrics API with constituents.view", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/development/metrics/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/requireConstituentOrgContext/);
		expect(route).toMatch(/CONSTITUENTS\.VIEW/);
	});
});
