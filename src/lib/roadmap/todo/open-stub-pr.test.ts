import { describe, expect, it } from "vitest";
import { parsePrNumberFromUrl, TodoStubPrError } from "./open-stub-pr";

describe("parsePrNumberFromUrl", () => {
	it("extracts the PR number from a gh pr create URL", () => {
		expect(
			parsePrNumberFromUrl("https://github.com/Remiiiiii/caalm-next/pull/323"),
		).toBe(323);
	});

	it("throws when the URL has no /pull/<number>", () => {
		expect(() => parsePrNumberFromUrl("not a pr url")).toThrow(TodoStubPrError);
	});
});
