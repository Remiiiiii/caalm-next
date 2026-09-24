import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.7 coordinator proxy logging", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.7",
	);

	it("is catalogued as proxy logging", () => {
		expect(task?.title).toMatch(/Coordinator proxy logging/i);
	});

	it("stores proxy source and actor on hour create", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/volunteers/shifts/[eventId]/hours/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/source: "proxy"/);
		expect(route).toMatch(/actorUserId: ctx\.user\.\$id/);
	});
});
