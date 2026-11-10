import { describe, expect, it } from "vitest";
import { matchPullRequestToTask } from "./github-pr-match";

describe("PTO PR matching", () => {
	it("does not let merged setup stub #230 complete tasks; active linked PR does", () => {
		const stub230 = {
			number: 230,
			title: "PTO S2 B3 Contracts CLM depth (2.11–2.15)",
			htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/230",
			headRef: "cursor/production-tools/s02-b3-5329",
			state: "merged" as const,
		};
		const active251 = {
			number: 251,
			title: "PTO S2 B3 Contracts CLM depth (2.11–2.15)",
			htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/251",
			headRef: "cursor/production-tools/s02-b3-5329",
			state: "open" as const,
		};
		expect(matchPullRequestToTask(stub230, 2, "2.11", "pto")).toBe(false);
		expect(matchPullRequestToTask(active251, 2, "2.11", "pto")).toBe(true);
	});

	it("does not let placeholder #226 complete 2.1–2.5; product #227 does", () => {
		const stub226 = {
			number: 226,
			title: "PTO S2 B1 Contracts CLM depth (2.1–2.5)",
			htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/226",
			headRef: "cursor/production-tools/s02-b1-5329",
			state: "closed" as const,
		};
		const product227 = {
			number: 227,
			title: "PTO S2 B1 Contracts CLM depth (2.1–2.5)",
			htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/227",
			headRef: "cursor/production-tools/s02-b1-5329",
			state: "merged" as const,
		};
		expect(matchPullRequestToTask(stub226, 2, "2.1", "pto")).toBe(false);
		expect(matchPullRequestToTask(product227, 2, "2.1", "pto")).toBe(true);
	});

	it("does not treat merged setup #229 as completing 2.6–2.10", () => {
		const stub229 = {
			number: 229,
			title: "PTO S2 B2 Contracts CLM depth (2.6–2.10)",
			htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/229",
			headRef: "cursor/production-tools/s02-b2-5329",
			state: "merged" as const,
		};
		const product250 = {
			number: 250,
			title: "PTO S2 B2 Contracts CLM depth (2.6–2.10)",
			htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/250",
			headRef: "cursor/production-tools/s02-b2-5329",
			state: "merged" as const,
		};
		expect(matchPullRequestToTask(stub229, 2, "2.6", "pto")).toBe(false);
		expect(matchPullRequestToTask(product250, 2, "2.6", "pto")).toBe(true);
	});
});
