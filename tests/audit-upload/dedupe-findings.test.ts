import { describe, expect, it } from "vitest";
import {
	findRepeatFinding,
	jaccardSimilarity,
} from "@/lib/audit-upload/dedupe-findings";

describe("dedupe findings", () => {
	it("scores similar titles highly", () => {
		expect(
			jaccardSimilarity(
				"Missing vendor encryption clause",
				"Missing vendor encryption clause in MSA",
			),
		).toBeGreaterThan(0.4);
	});

	it("flags a repeat when history overlaps", () => {
		const repeat = findRepeatFinding(
			{
				title: "Missing backup encryption",
				description: "Vendor backups are not encrypted at rest",
				frameworkRefs: ["SOC2-CC6"],
			},
			[
				{
					$id: "hist-1",
					title: "Missing backup encryption control",
					description: "Vendor backups are not encrypted at rest",
					frameworkRefs: ["SOC2-CC6"],
				},
			],
		);
		expect(repeat?.$id).toBe("hist-1");
	});

	it("returns null when history is unrelated", () => {
		expect(
			findRepeatFinding(
				{
					title: "Board minutes missing",
					description: "No signed minutes for Q1",
					frameworkRefs: ["GOV-1"],
				},
				[
					{
						$id: "hist-1",
						title: "Firewall rule drift",
						description: "Production allow list includes unused ports",
						frameworkRefs: ["SOC2-CC6"],
					},
				],
			),
		).toBeNull();
	});
});
