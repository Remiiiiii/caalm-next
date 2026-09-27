import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 5.9 tag hours to grant program", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[5]?.tasks.find(
		(row) => row.taskCode === "5.9",
	);

	it("is catalogued as grant tagging", () => {
		expect(task?.title).toMatch(/Tag hours to a grant program/i);
	});

	it("queries hours by grantContractId within org", () => {
		const repo = readFileSync(
			join(process.cwd(), "src/lib/volunteers/volunteer-hours.repository.ts"),
			"utf8",
		);
		expect(repo).toMatch(/listHoursForGrant/);
		expect(repo).toMatch(/grantContractId/);
	});

	it("rejects cross-org grant on approve", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/volunteers/hours/[hourId]/approve/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/assertGrantContractInOrg/);
	});
});
