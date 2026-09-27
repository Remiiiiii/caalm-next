import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyImportRow } from "@/lib/constituents/import/dry-run";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.2 dry-run import", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.2",
	);

	it("is catalogued as dry-run import", () => {
		expect(task?.title).toMatch(/Dry-run import/i);
	});

	it("reports duplicate emails instead of merging", () => {
		const plan = classifyImportRow({
			row: {
				rowIndex: 1,
				firstName: "Pat",
				lastName: "Lee",
				email: "pat@org.org",
				type: "donor",
			},
			existingMatches: [],
			fileDuplicateEmails: new Set(["pat@org.org"]),
		});
		expect(plan.action).toBe("duplicate");
	});

	it("exposes dry-run on the import API", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/constituents/import/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/dryRun=1/);
		expect(route).toMatch(/createImportBatch/);
	});
});
