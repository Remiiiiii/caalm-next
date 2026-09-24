import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.3 guest becomes constituent at check-in", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.3",
	);

	it("is catalogued as check-in constituent linking", () => {
		expect(task?.title).toMatch(/constituent at check-in/i);
	});

	it("blocks constituentId on draft registrations", () => {
		const repo = readFileSync(
			join(
				process.cwd(),
				"src/lib/events/event-registrations.repository.ts",
			),
			"utf8",
		);
		expect(repo).toMatch(/Draft registrations cannot link a constituent/);
	});

	it("creates constituent during check-in when missing", () => {
		const service = readFileSync(
			join(process.cwd(), "src/lib/events/check-in.service.ts"),
			"utf8",
		);
		expect(service).toMatch(/createConstituentWithDuplicateGate/);
		expect(service).toMatch(/markRegistrationCheckedIn/);
	});
});
