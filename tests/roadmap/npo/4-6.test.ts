import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { FORM_990_SETTINGS_INTRO } from "@/lib/funding/finance-scope-copy";
import { FORM_990_PART_IX_BUCKETS } from "@/lib/funding/form-990/types";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 4.6 990 functional-expense mapping", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.6",
	);

	it("is catalogued as 990 mapping table", () => {
		expect(task?.title).toMatch(/990 functional-expense mapping/i);
	});

	it("uses Part IX worksheet buckets only", () => {
		expect(FORM_990_PART_IX_BUCKETS).toEqual([
			"program",
			"management",
			"fundraising",
		]);
	});

	it("uses alphanumeric mapping collection id", () => {
		expect(appwriteConfig.form990ExpenseMappingsCollectionId).toMatch(
/^[a-zA-Z0-9]{20,36}$/,
		);
	});

	it("UI copy says worksheet not e-file", () => {
		expect(FORM_990_SETTINGS_INTRO.toLowerCase()).toMatch(/worksheet/);
		expect(FORM_990_SETTINGS_INTRO).toMatch(/not an IRS e-file/i);
	});
});
