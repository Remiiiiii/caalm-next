import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	assembleFunderSnapshot,
	funderSnapshotToCsv,
} from "@/lib/funding/funder-snapshot";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 8.7 funder snapshot PDF/CSV", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[8]?.tasks.find(
		(row) => row.taskCode === "8.7",
	);

	it("is catalogued as funder snapshot export", () => {
		expect(task?.title).toMatch(/Funder snapshot PDF\/CSV/i);
	});

	it("CSV includes assembler sections", () => {
		const snapshot = assembleFunderSnapshot({
			orgId: "org-a",
			contractId: "grant-1",
			contractName: "Arts grant",
			fund: { fundId: "f1", code: "ART", name: "Arts restricted" },
			restrictions: [
				{
					releasedAt: "2026-01-15",
					amount: 1000,
					fundFrom: "R01",
					fundTo: "U01",
				},
			],
			budgetLines: [],
			obligations: [],
			gifts: [],
			volunteerHours: [],
		});
		const csv = funderSnapshotToCsv(snapshot);
		expect(csv).toMatch(/section,field,value/);
		expect(csv).toMatch(/fund,code,ART/);
		expect(csv).toMatch(/restriction,release/);
	});

	it("gates export with funding.view", () => {
		const route = readFileSync(
			join(
				process.cwd(),
				"src/app/api/funding/grants/[contractId]/funder-snapshot/route.ts",
			),
			"utf8",
		);
		expect(route).toMatch(/requireFundingOrgContext/);
		expect(route).toMatch(/FUNDING\.VIEW/);
	});
});
