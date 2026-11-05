import { describe, expect, it } from "vitest";
import {
	citationsPassed,
	verifyCitations,
} from "@/lib/audit-upload/citation-verify";

describe("verifyCitations", () => {
	it("marks a quote as matched when it appears in the source", () => {
		const result = verifyCitations(
			"The vendor must encrypt backup files at rest.",
			[{ quote: "encrypt backup files at rest" }],
		);
		expect(result[0]?.matched).toBe(true);
		expect(citationsPassed(result)).toBe(true);
	});

	it("quarantines a quote that is not in the source", () => {
		const result = verifyCitations("No encryption language here.", [
			{ quote: "The vendor must encrypt backup files at rest immediately" },
		]);
		expect(result[0]?.matched).toBe(false);
		expect(citationsPassed(result)).toBe(false);
	});

	it("fails when there are no citations", () => {
		expect(citationsPassed([])).toBe(false);
	});
});
