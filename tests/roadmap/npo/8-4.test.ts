import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.4 campaign cost field", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.4",
	);

	it("is catalogued as campaign cost field", () => {
		expect(task?.title).toMatch(/Campaign cost field/i);
	});

	it("persists campaignCost on the campaign model", () => {
		const types = readFileSync(
			join(process.cwd(), "src/lib/campaigns/types.ts"),
			"utf8",
		);
		expect(types).toMatch(/campaignCost/);
		const repo = readFileSync(
			join(process.cwd(), "src/lib/campaigns/repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/campaignCost/);
	});

	it("rejects negative cost in the campaigns PATCH route", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/campaigns/[id]/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/cannot be negative/);
	});
});
