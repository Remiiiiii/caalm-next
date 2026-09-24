import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.5 constituent list page", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.5",
	);
	const page = readFileSync(
		join(process.cwd(), "src/app/(root)/constituents/page.tsx"),
		"utf8",
	);
	const client = readFileSync(
		join(
			process.cwd(),
			"src/components/constituents/ConstituentsPageClient.tsx",
		),
		"utf8",
	);
	const rowMenu = readFileSync(
		join(process.cwd(), "src/components/constituents/ConstituentRowMenu.tsx"),
		"utf8",
	);

	it("is catalogued as the list page", () => {
		expect(task?.title).toMatch(/list page/i);
	});

	it("guards the route with constituents.view", () => {
		expect(page).toMatch(/requirePagePermission/);
		expect(page).toMatch(/PERMISSIONS\.CONSTITUENTS\.VIEW/);
	});

	it("wires SearchField, filters, PageIndex, and no-data art", () => {
		expect(client).toMatch(/SearchField/);
		expect(client).toMatch(/PageIndex/);
		expect(client).toMatch(/hideWhenSinglePage/);
		expect(client).toMatch(/doNotContact/);
		expect(client).toMatch(/no-data\.svg/);
		expect(rowMenu).toMatch(/dots\.svg/);
	});
});
