import { describe, expect, it } from "vitest";
import {
	evaluateNpoPackagingGate,
	NPO_PACKAGING_SCAN_ROOTS,
} from "@/lib/roadmap/nonprofit/npo-packaging-gate";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 10.6 Packaging grep for banned NPO claims", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.6",
	);

	it("is catalogued", () => {
		expect(task?.title).toMatch(/Packaging grep/i);
	});

	it("scans landing and docs roots", () => {
		expect(NPO_PACKAGING_SCAN_ROOTS).toContain("src/components/landing");
		expect(NPO_PACKAGING_SCAN_ROOTS).toContain("src/content/docs");
	});

	it("packaging gate is green (no banned marketing claims)", () => {
		const gate = evaluateNpoPackagingGate();
		expect(gate.bannedViolations).toEqual([]);
	});
});
