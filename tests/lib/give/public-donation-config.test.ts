import { describe, expect, it } from "vitest";
import {
	buildConfigDesignationOptions,
	resolvePublicImpactStatement,
} from "@/lib/give/public-donation-config";

describe("public donation config helpers", () => {
	it("maps designation labels to stable option values", () => {
		const options = buildConfigDesignationOptions([
			"Where it's needed most",
			"Literacy program",
		]);
		expect(options[0]?.value).toBe("donation-config:0");
		expect(options[1]?.label).toBe("Literacy program");
	});

	it("resolves impact for amount or lowest preset", () => {
		const config = {
			amountsCents: [2500, 5000],
			designations: ["General"],
			impactStatements: { "2500": "week of tutoring materials." },
			ein: "47-3829102",
			legalText: "Tax deductible.",
			frequencyOptions: ["one_time", "monthly"] as const,
		};
		expect(resolvePublicImpactStatement(config, 25)).toContain("tutoring");
		expect(resolvePublicImpactStatement(config, 999)).toContain("tutoring");
	});
});
