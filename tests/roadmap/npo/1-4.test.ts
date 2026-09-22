import { describe, expect, it } from "vitest";
import {
	matchesDuplicateSignals,
	normalizeEmail,
	normalizeFirstName,
	normalizeLastName,
	toDuplicateCandidates,
} from "@/lib/constituents/duplicates";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 1.4 duplicate detection", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[1]?.tasks.find(
		(row) => row.taskCode === "1.4",
	);

	it("is catalogued for email and name", () => {
		expect(task?.title).toMatch(/duplicate/i);
	});

	it("normalizes email and last name", () => {
		expect(normalizeEmail("  Pat@Org.ORG ")).toBe("pat@org.org");
		expect(normalizeLastName("  Van  Dyke ")).toBe("van dyke");
		expect(normalizeFirstName("  Jordan ")).toBe("jordan");
	});

	it("treats a normalized email match as a duplicate", () => {
		expect(
			matchesDuplicateSignals(
				{
					normalizedEmail: "pat@org.org",
					normalizedFirstName: "pat",
					normalizedLastName: "lee",
				},
				{
					normalizedEmail: "pat@org.org",
					firstName: "Patricia",
					normalizedLastName: "lee",
				},
			),
		).toBe(true);
	});

	it("does not flag every matching last name when emails differ", () => {
		expect(
			matchesDuplicateSignals(
				{
					normalizedEmail: "a@org.org",
					normalizedFirstName: "pat",
					normalizedLastName: "smith",
				},
				{
					normalizedEmail: "b@org.org",
					firstName: "pat",
					normalizedLastName: "smith",
				},
			),
		).toBe(false);
	});

	it("maps candidate ids for a 409 payload", () => {
		const candidates = toDuplicateCandidates([
			{
				$id: "cst_1",
				firstName: "Pat",
				lastName: "Lee",
				email: "pat@org.org",
			},
		]);
		expect(candidates).toEqual([
			{
				$id: "cst_1",
				firstName: "Pat",
				lastName: "Lee",
				email: "pat@org.org",
			},
		]);
	});
});
