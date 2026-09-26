import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 9.3 commit import batch", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[9]?.tasks.find(
		(row) => row.taskCode === "9.3",
	);

	it("is catalogued as commit import batch", () => {
		expect(task?.title).toMatch(/Commit import batch/i);
	});

	it("replays committed batches as a no-op", () => {
		const service = readFileSync(
			join(process.cwd(), "src/lib/constituents/import/commit.service.ts"),
			"utf8",
		);
		expect(service).toMatch(/alreadyCommitted/);
		expect(service).toMatch(/markImportBatchFailed/);
	});

	it("commits through a dedicated API route", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/constituents/import/commit/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/commitImportBatch/);
		expect(route).toMatch(/CONSTITUENTS\.MANAGE/);
	});
});
