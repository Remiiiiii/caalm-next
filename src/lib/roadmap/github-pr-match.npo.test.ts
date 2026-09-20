import { describe, expect, it } from "vitest";
import {
	isSettledRoadmapPullRequestState,
	matchPullRequestToSection,
	matchPullRequestToTask,
	resolveCatalogFromPrMatch,
	shouldListRoadmapSectionPullRequest,
} from "./github-pr-match";

describe("nonprofit PR matching", () => {
	const npoPr = {
		number: 9101,
		title: "NPO 1.1 Constituent record model",
		htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/9101",
		headRef: "cursor/nonprofit/1-1.1-constituent-model",
		state: "open" as const,
	};

	const clmSecurity = {
		number: 52,
		title: "1.1 Eliminate 2FA cookie-as-session",
		htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/52",
		headRef: "cursor/clm-2fa-session-aaaa",
		state: "open" as const,
	};

	it("maps cursor/nonprofit/ branches to the nonprofit catalog, not CLM", () => {
		expect(matchPullRequestToSection(npoPr, 1, "npo")).toBe(true);
		expect(matchPullRequestToSection(npoPr, 1, "clm")).toBe(false);
		expect(matchPullRequestToTask(npoPr, 1, "1.1", "npo")).toBe(true);
		expect(matchPullRequestToTask(npoPr, 1, "1.1", "clm")).toBe(false);
		expect(resolveCatalogFromPrMatch(npoPr)).toEqual({
			catalogKey: "npo",
			sectionNumber: 1,
		});
	});

	it("still maps legacy npo/ branches to the nonprofit catalog", () => {
		const legacy = { ...npoPr, headRef: "npo/1-1.1-constituent-model" };
		expect(matchPullRequestToSection(legacy, 1, "npo")).toBe(true);
		expect(resolveCatalogFromPrMatch(legacy)?.catalogKey).toBe("npo");
	});

	it("does not let a CLM 1.1 title complete the nonprofit 1.1 task", () => {
		expect(matchPullRequestToTask(clmSecurity, 1, "1.1", "npo")).toBe(false);
		expect(resolveCatalogFromPrMatch(clmSecurity)?.catalogKey).toBe("clm");
	});

	it("keeps closed and merged PRs on both boards", () => {
		expect(shouldListRoadmapSectionPullRequest("open", "npo")).toBe(true);
		expect(shouldListRoadmapSectionPullRequest("unknown", "npo")).toBe(true);
		expect(shouldListRoadmapSectionPullRequest("closed", "npo")).toBe(true);
		expect(shouldListRoadmapSectionPullRequest("merged", "npo")).toBe(true);
		expect(shouldListRoadmapSectionPullRequest("closed", "clm")).toBe(true);
		expect(shouldListRoadmapSectionPullRequest("merged", "clm")).toBe(true);
	});

	it("maps batch PR 113 and s01-b2 branch to 1.6–1.10, not 1.1 or 1.11", () => {
		const batch113 = {
			number: 113,
			title: "NPO S1 B2 Constituent CRM Foundation (1.6–1.10)",
			htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/113",
			headRef: "cursor/nonprofit/s01-b2-340a",
			state: "open" as const,
		};
		expect(matchPullRequestToTask(batch113, 1, "1.6", "npo")).toBe(true);
		expect(matchPullRequestToTask(batch113, 1, "1.7.a", "npo")).toBe(true);
		expect(matchPullRequestToTask(batch113, 1, "1.10.b", "npo")).toBe(true);
		expect(matchPullRequestToTask(batch113, 1, "1.1", "npo")).toBe(false);
		expect(matchPullRequestToTask(batch113, 1, "1.11", "npo")).toBe(false);
		expect(matchPullRequestToTask(batch113, 1, "1.6", "clm")).toBe(false);
		expect(resolveCatalogFromPrMatch(batch113)).toEqual({
			catalogKey: "npo",
			sectionNumber: 1,
		});
	});

	it("does not let stub 109 complete 1.1–1.5; product 131 does", () => {
		const stub109 = {
			number: 109,
			title: "NPO S1 B1 catalog stub",
			htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/109",
			headRef: "cursor/nonprofit/s01-b1-340a",
			state: "closed" as const,
		};
		const product131 = {
			number: 131,
			title: "NPO 1.1 NPO 1.2 NPO 1.3 NPO 1.4 NPO 1.5 Constituent CRM Foundation",
			htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/131",
			headRef: "cursor/nonprofit/s01-b1-product",
			state: "merged" as const,
		};
		expect(matchPullRequestToTask(stub109, 1, "1.1", "npo")).toBe(false);
		expect(matchPullRequestToTask(product131, 1, "1.1", "npo")).toBe(true);
		expect(matchPullRequestToTask(product131, 1, "1.6", "npo")).toBe(false);
	});

	it("treats closed and merged as settled for strikethrough", () => {
		expect(isSettledRoadmapPullRequestState("closed")).toBe(true);
		expect(isSettledRoadmapPullRequestState("merged")).toBe(true);
		expect(isSettledRoadmapPullRequestState("open")).toBe(false);
		expect(isSettledRoadmapPullRequestState("unknown")).toBe(false);
	});
});
