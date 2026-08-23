import { describe, expect, it } from "vitest";
import {
	findSectionPullRequest,
	matchPullRequestToSection,
	matchPullRequestToTask,
	stripHtmlFromPrBody,
} from "./github-pr-match";

describe("github-pr-match", () => {
	const roadmapPr = {
		number: 49,
		title: "CLM Completion Roadmap engine (IT portal)",
		htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/49",
		headRef: "cursor/clm-roadmap-engine-5329",
		state: "open" as const,
	};

	const calendarPr = {
		number: 60,
		title: "Extract ApprovalReviewDialog from OutlookStyleCalendar",
		htmlUrl: "https://github.com/Remiiiiii/caalm-next/pull/60",
		headRef: "cursor/calendar-approval-dialog-d363",
		state: "open" as const,
	};

	it("matches a catalog-linked PR to its section, not by title prefix", () => {
		expect(matchPullRequestToSection(roadmapPr, 0)).toBe(true);
		expect(matchPullRequestToSection(roadmapPr, 1)).toBe(false);
		expect(matchPullRequestToSection(calendarPr, 3)).toBe(true);
	});

	it("matches task branch convention", () => {
		const taskPr = {
			...roadmapPr,
			headRef: "clm/0-0.1-data-model",
		};
		expect(matchPullRequestToTask(taskPr, 0, "0.1")).toBe(true);
	});

	it("finds section PR from open list via catalog number", () => {
		expect(findSectionPullRequest([roadmapPr, calendarPr], 0)).toEqual(
			roadmapPr,
		);
		expect(findSectionPullRequest([roadmapPr, calendarPr], 3)).toEqual(
			calendarPr,
		);
	});
});

describe("stripHtmlFromPrBody", () => {
	it("removes Cursor agent footer HTML and comments", () => {
		const raw = `## Summary

Ship the roadmap engine.

<!-- CURSOR_AGENT_PR_BODY_END -->
<div>
<a href="https://cursor.com/agents/bc-181a3be9-059e-46e6-9cfa-c0ba7fcb5329?cursor_ref=pr_footer&cursor_cta=open_in_web">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/open-in-web-dark.png">
<img alt="Open in Web" width="114" height="28">
</picture>
</a>
&nbsp;
<a href="https://cursor.com/background-agent?bcId=bc-181a3be9-059e-46e6-9cfa-c0ba7fcb5329">Open in Cursor</a>
</div>`;
		expect(stripHtmlFromPrBody(raw)).toBe(
			"## Summary\n\nShip the roadmap engine.",
		);
	});
});
