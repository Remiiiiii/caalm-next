import { describe, expect, it } from "vitest";
import {
	matchPullRequestToSection,
	matchPullRequestToTask,
	resolveCatalogFromPrMatch,
} from "./github-pr-match";

describe("nonprofit PR matching", () => {
	const npoPr = {
		number: 9101,
		title: "NPO 1.1 Constituent record model",
		htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/9101",
		headRef: "npo/1-1.1-constituent-model",
		state: "open" as const,
	};

	const clmSecurity = {
		number: 52,
		title: "1.1 Eliminate 2FA cookie-as-session",
		htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/52",
		headRef: "cursor/clm-2fa-session-aaaa",
		state: "open" as const,
	};

	it("maps npo/ branches to the nonprofit catalog, not CLM", () => {
		expect(matchPullRequestToSection(npoPr, 1, "npo")).toBe(true);
		expect(matchPullRequestToSection(npoPr, 1, "clm")).toBe(false);
		expect(matchPullRequestToTask(npoPr, 1, "1.1", "npo")).toBe(true);
		expect(matchPullRequestToTask(npoPr, 1, "1.1", "clm")).toBe(false);
		expect(resolveCatalogFromPrMatch(npoPr)).toEqual({
			catalogKey: "npo",
			sectionNumber: 1,
		});
	});

	it("does not let a CLM 1.1 title complete the nonprofit 1.1 task", () => {
		expect(matchPullRequestToTask(clmSecurity, 1, "1.1", "npo")).toBe(false);
		expect(resolveCatalogFromPrMatch(clmSecurity)?.catalogKey).toBe("clm");
	});
});
