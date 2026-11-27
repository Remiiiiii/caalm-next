import { describe, expect, it } from "vitest";
import { formatGapDescription, gapRequirementId } from "./findings";

describe("formatGapDescription / gapRequirementId", () => {
	it("round-trips the requirementId through the description prefix", () => {
		const description = formatGapDescription({
			requirementId: "CW-PROVIDER-CONTRACT",
			criteria: "Written service contracts on file",
			condition: "Claimed in interview, never submitted",
			cause: "Reviewer lost track after the Q3 reorg",
			effect: "Cannot corroborate contract terms at audit time",
		});
		expect(gapRequirementId(description)).toBe("CW-PROVIDER-CONTRACT");
		expect(description).toContain(
			"Criteria: Written service contracts on file",
		);
		expect(description).toContain("Condition: Claimed in interview");
		expect(description).toContain("Cause: Reviewer lost track");
		expect(description).toContain("Effect: Cannot corroborate");
	});

	it("omits cause/effect when not provided", () => {
		const description = formatGapDescription({
			requirementId: "CC6",
			criteria: "Access reviewed quarterly",
			condition: "No record of the last review",
		});
		expect(description).not.toContain("Cause:");
		expect(description).not.toContain("Effect:");
	});

	it("returns undefined for gaps raised outside the matrix flow", () => {
		expect(gapRequirementId("Low score on answer: foo")).toBeUndefined();
	});
});
