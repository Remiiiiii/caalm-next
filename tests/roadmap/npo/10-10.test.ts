import { describe, expect, it } from "vitest";
import {
	matchPullRequestToTask,
	resolveCatalogFromPrMatch,
} from "@/lib/roadmap/github-pr-match";
import { buildSeedSnapshot } from "@/lib/roadmap/store";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";
import { FUNDING_OUT_OF_LANE } from "@/lib/funding/finance-scope-copy";

describe("NPO 10.10 Final dual-catalog isolation check", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[10]?.tasks.find(
		(row) => row.taskCode === "10.10",
	);

	it("is catalogued", () => {
		expect(task?.title).toMatch(/dual-catalog isolation/i);
	});

	it("CLM seed keeps 16 sections; NPO ids stay npo_ prefixed", () => {
		const clm = buildSeedSnapshot("clm");
		const npo = buildSeedSnapshot("npo");
		expect(clm.sections).toHaveLength(16);
		expect(npo.sections.every((s) => s.$id.startsWith("npo_"))).toBe(true);
		const clmIds = new Set(clm.sections.map((s) => s.$id));
		for (const section of npo.sections) {
			expect(clmIds.has(section.$id)).toBe(false);
		}
	});

	it("NPO 1.1 title cannot complete CLM 1.1", () => {
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
		expect(matchPullRequestToTask(npoPr, 1, "1.1", "npo")).toBe(true);
		expect(matchPullRequestToTask(clmSecurity, 1, "1.1", "npo")).toBe(false);
		expect(resolveCatalogFromPrMatch(clmSecurity)?.catalogKey).toBe("clm");
	});

	it("points packaging guards at finance out-of-lane phrases", () => {
		expect(FUNDING_OUT_OF_LANE).toContain("990 e-file");
		expect(FUNDING_OUT_OF_LANE).toContain("payroll");
	});
});
