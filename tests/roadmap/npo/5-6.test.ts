import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.6 hour log and approval", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.6",
	);

	it("is catalogued as hour log and approval", () => {
		expect(task?.title).toMatch(/Hour log and approval/i);
	});

	it("excludes unapproved hours from totals", () => {
		const repo = readFileSync(
			join(process.cwd(), "src/lib/volunteers/volunteer-hours.repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/sumApprovedMinutes/);
		expect(repo).toMatch(/approvalStatus === "approved"/);
	});

	it("requires volunteers.manage to approve hours", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/volunteers/hours/[hourId]/approve/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/VOLUNTEERS\.MANAGE/);
	});
});
