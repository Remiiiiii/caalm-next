import { describe, expect, it } from "vitest";
import { splitFindingDescription } from "./split-finding-description";

describe("splitFindingDescription", () => {
	it("splits condition and How to correct on a blank line", () => {
		const raw = [
			"The Center recorded CDC award spend under the wrong assistance listing.",
			"Map each federal award in the accounting system to its assistance listing number.",
		].join("\n\n");

		expect(splitFindingDescription(raw)).toEqual({
			conditionText:
				"The Center recorded CDC award spend under the wrong assistance listing.",
			correctiveText:
				"Map each federal award in the accounting system to its assistance listing number.",
		});
	});

	it("joins extra blocks into How to correct", () => {
		const raw = "Condition one.\n\nDo this first.\n\nThen do this.";
		expect(splitFindingDescription(raw)).toEqual({
			conditionText: "Condition one.",
			correctiveText: "Do this first.\n\nThen do this.",
		});
	});

	it("keeps a single block under Finding with no How to correct", () => {
		expect(splitFindingDescription("Only the condition is here.")).toEqual({
			conditionText: "Only the condition is here.",
			correctiveText: "",
		});
	});

	it("returns empty strings for blank input", () => {
		expect(splitFindingDescription("")).toEqual({
			conditionText: "",
			correctiveText: "",
		});
		expect(splitFindingDescription("   \n\n  ")).toEqual({
			conditionText: "",
			correctiveText: "",
		});
		expect(splitFindingDescription(null)).toEqual({
			conditionText: "",
			correctiveText: "",
		});
	});
});
