import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.7 Journal export CSV/IIF", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.7",
	);

	it("is catalogued as journal export", () => {
		expect(task?.title).toMatch(/Journal export CSV\/IIF/i);
	});

	it("requires date range on journal export API", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/funding/journal-export/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/startDate and endDate query params are required/);
		expect(route).toMatch(/PERMISSIONS\.FUNDING\.VIEW/);
	});

	it("includes fund code and restriction class columns in CSV", () => {
		const csv = readFileSync(
			join(process.cwd(), "src/lib/funding/journal-export/format-csv.ts"),
			"utf8",
		);
		expect(csv).toMatch(/fund_code/);
		expect(csv).toMatch(/restriction_class/);
		const collect = readFileSync(
			join(process.cwd(), "src/lib/funding/journal-export/collect.ts"),
			"utf8",
		);
		expect(collect).toMatch(/giftCashTotal/);
		expect(collect).toMatch(/Query\.equal\("status", "posted"\)/);
	});
});
