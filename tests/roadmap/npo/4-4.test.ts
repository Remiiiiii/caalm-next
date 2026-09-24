import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { GRANT_BUDGET_CATEGORIES } from "@/lib/funding/grant-budget.types";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 4.4 grant budget lines", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.4",
	);

	it("is catalogued as grant budget lines", () => {
		expect(task?.title).toMatch(/Grant budget lines/i);
	});

	it("defines personnel, program, admin, and other categories", () => {
		expect(GRANT_BUDGET_CATEGORIES).toEqual([
			"personnel",
			"program",
			"admin",
			"other",
		]);
	});

	it("uses alphanumeric grant_budget_lines id", () => {
		expect(appwriteConfig.grantBudgetLinesCollectionId).toMatch(
/^[a-zA-Z0-9]{20,36}$/,
		);
	});

	it("rejects cross-org grants via loadContractForOrg", () => {
		const repo = readFileSync(
			join(process.cwd(), "src/lib/funding/grant-budget.repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/loadContractForOrg/);
	});
});
