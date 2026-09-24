import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 7.4 contacted writeback", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[7]?.tasks.find(
		(row) => row.taskCode === "7.4",
	);

	it("is catalogued as contacted writeback", () => {
		expect(task?.title).toMatch(/Contacted writeback/i);
	});

	it("writes timeline notes and stewardshipContactedAt", () => {
		const service = readFileSync(
			join(process.cwd(), "src/lib/stewardship/stewardship-queue.ts"),
			"utf8",
		);
		expect(service).toMatch(/createNote/);
		expect(service).toMatch(/markStewardshipContactedAt/);
		expect(service).toMatch(/stewardshipContactedAt < row.computedAt/);
	});
});
