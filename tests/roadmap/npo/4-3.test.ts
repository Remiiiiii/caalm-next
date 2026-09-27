import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isGrantMissingFund } from "@/lib/funding/grant-fund";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 4.3 flag grants missing fund", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.3",
	);

	it("is catalogued as missing fund flag", () => {
		expect(task?.title).toMatch(/missing a fund/i);
	});

	it("detects grant streams without fundId", () => {
		expect(
			isGrantMissingFund({
				contractType: "Grant_Agreement",
				fundId: null,
			}),
		).toBe(true);
	});

	it("exposes missingFund filter on retention API", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/funding/retention/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/missingFund/);
		const board = readFileSync(
			join(process.cwd(), "src/components/funding/RetentionBoard.tsx"),
			"utf8",
		);
		expect(board).toMatch(/Missing fund/);
	});
});
