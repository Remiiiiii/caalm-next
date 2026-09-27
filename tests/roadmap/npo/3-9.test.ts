import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 3.9 wealth-screen CSV import", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.9",
	);

	it("is catalogued as wealth-screen import", () => {
		expect(task?.title).toMatch(/Wealth-screen CSV/i);
	});

	it("uses alphanumeric wealth screen collection id", () => {
		expect(appwriteConfig.constituentWealthScreensCollectionId).toMatch(
			/^[a-zA-Z0-9]{20,36}$/,
		);
	});

	it("rejects cross-org ids on import route", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/constituents/wealth-import/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/constituent\.orgId !== ctx\.orgId/);
		expect(route).toMatch(/logConstituentAudit/);
	});

	it("includes constituent wealth panel and column mapping", () => {
		const panel = readFileSync(
			join(
				process.cwd(),
				"src/components/constituents/ConstituentWealthPanel.tsx",
			),
			"utf8",
		);
		expect(panel).toMatch(/Constituent wealth/);
		expect(panel).toMatch(/columnMap/);
	});
});
