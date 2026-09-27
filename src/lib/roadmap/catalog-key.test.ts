import { describe, expect, it } from "vitest";
import { catalogBranchPrefix, isNonprofitRoadmapBranch } from "./catalog-key";

describe("isNonprofitRoadmapBranch", () => {
	it("matches the cursor/nonprofit prefix and the engine branch", () => {
		expect(isNonprofitRoadmapBranch("cursor/nonprofit/s01-b1-340a")).toBe(true);
		expect(
			isNonprofitRoadmapBranch("cursor/nonprofit/1-1.1-constituent-model"),
		).toBe(true);
		expect(isNonprofitRoadmapBranch("cursor/nonprofit-roadmap-340a")).toBe(
			true,
		);
	});

	it("does not treat PR-log agent branches as nonprofit", () => {
		expect(
			isNonprofitRoadmapBranch("cursor/funding-retention-pursuit-9ee5"),
		).toBe(false);
		expect(isNonprofitRoadmapBranch("cursor/clm-roadmap-engine-5329")).toBe(
			false,
		);
	});

	it("keeps catalogBranchPrefix aligned with that home", () => {
		expect(catalogBranchPrefix("npo")).toBe("cursor/nonprofit");
		expect(catalogBranchPrefix("clm")).toBe("clm");
	});
});
