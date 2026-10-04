import { describe, expect, it } from "vitest";
import {
	catalogBranchPrefix,
	isNonprofitRoadmapBranch,
	isPlatformReadinessRoadmapBranch,
	parseRoadmapCatalogKey,
} from "./catalog-key";

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
		expect(catalogBranchPrefix("prd")).toBe("cursor/platform-readiness");
	});
});

describe("platform readiness roadmap branches", () => {
	it("matches engine and task branches", () => {
		expect(
			isPlatformReadinessRoadmapBranch(
				"cursor/platform-readiness-engine-5329",
			),
		).toBe(true);
		expect(
			isPlatformReadinessRoadmapBranch(
				"cursor/platform-readiness/1-1.1-org-scope",
			),
		).toBe(true);
	});

	it("does not match generic cursor agent branches", () => {
		expect(
			isPlatformReadinessRoadmapBranch("cursor/funding-retention-9ee5"),
		).toBe(false);
	});
});

describe("parseRoadmapCatalogKey", () => {
	it("accepts prd aliases", () => {
		expect(parseRoadmapCatalogKey("prd")).toBe("prd");
		expect(parseRoadmapCatalogKey("platform-readiness")).toBe("prd");
		expect(parseRoadmapCatalogKey(null)).toBe("clm");
	});
});
