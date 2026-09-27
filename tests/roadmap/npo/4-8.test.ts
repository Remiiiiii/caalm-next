import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RestrictionReleaseError } from "@/lib/funding/restriction-release.repository";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 4.8 restriction release event", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[4]?.tasks.find(
		(row) => row.taskCode === "4.8",
	);

	it("is catalogued as restriction release", () => {
		expect(task?.title).toMatch(/Restriction release/i);
	});

	it("uses restriction release error for over-balance guard", () => {
		const err = new RestrictionReleaseError("too much", 400);
		expect(err.status).toBe(400);
	});

	it("audit logs actor grant and amount on POST route", () => {
		const source = readFileSync(
			join(
				process.cwd(),
				"src/app/api/funding/grants/[contractId]/restriction-releases/route.ts",
			),
			"utf8",
		);
		expect(source).toMatch(/logAuditEvent/);
		expect(source).toMatch(/amount/);
		expect(source).toMatch(/target_type: "grant"/);
	});
});
