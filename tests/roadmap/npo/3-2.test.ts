import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 3.2 RFM feature extraction", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[3]?.tasks.find(
		(row) => row.taskCode === "3.2",
	);

	it("is catalogued as RFM", () => {
		expect(task?.title).toMatch(/RFM/i);
	});

	it("lives in rfm.ts without Date.now()", () => {
		const source = readFileSync(
			join(process.cwd(), "src/lib/fundraising/rfm.ts"),
			"utf8",
		);
		expect(source).toMatch(/extractRfmFeatures/);
		expect(source).not.toMatch(/Date\.now\(/);
	});
});
