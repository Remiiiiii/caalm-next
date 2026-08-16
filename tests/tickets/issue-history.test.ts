import { describe, expect, it } from "vitest";
import {
	buildIncidentTimelineSteps,
	buildResolvedSummary,
	eventSummary,
	getIncidentTimelineResourceLinks,
	formatIssueHistoryDate,
	formatIssueHistoryMonth,
	buildIssueHistoryCalendarWindows,
	findCalendarWindowIndexForMonth,
	formatCalendarThreeMonthLabel,
	formatThreeMonthWindowLabel,
	formatVisibleMonthRange,
	getLatestEvent,
	groupTicketsByMonthDay,
	humanizeEventType,
	issueHistoryMonthWindowCount,
	sliceIssueHistoryMonthWindow,
	timelineIconKind,
} from "@/lib/tickets/issue-history";
import type { Ticket, TicketEvent } from "@/lib/tickets/ticket.types";

function ticket(partial: Partial<Ticket> & { $id: string; submittedAt: string }): Ticket {
	return {
		title: "Test issue",
		description: "Rolled back a change.",
		submittedByUserId: "user-1",
		submittedByName: "Ada",
		department: "IT",
		severity: "medium",
		status: "RESOLVED",
		orgId: "default_organization",
		...partial,
	};
}

function event(
	partial: Partial<TicketEvent> & {
		$id: string;
		ticketId: string;
		timestamp: string;
		eventType: TicketEvent["eventType"];
	},
): TicketEvent {
	return {
		actor: "system",
		...partial,
	};
}

describe("getLatestEvent", () => {
	it("returns the newest event by timestamp", () => {
		const latest = getLatestEvent([
			event({
				$id: "e1",
				ticketId: "t1",
				eventType: "CREATED",
				timestamp: "2026-08-13T08:00:00.000Z",
			}),
			event({
				$id: "e2",
				ticketId: "t1",
				eventType: "DEPLOYED",
				timestamp: "2026-08-13T09:01:00.000Z",
			}),
		]);
		expect(latest?.$id).toBe("e2");
	});

	it("returns null when there are no events", () => {
		expect(getLatestEvent([])).toBeNull();
	});
});

describe("humanizeEventType", () => {
	it("maps known types to readable labels", () => {
		expect(humanizeEventType("DEPLOYED")).toBe("Resolved");
		expect(humanizeEventType("PR_OPENED")).toBe("PR created");
		expect(humanizeEventType("ASSIGNED")).toBe("Assigned to");
		expect(humanizeEventType("PR_MERGED")).toBe("Pull request merged");
	});
});

describe("eventSummary", () => {
	it("prefers metadata reason over the default copy", () => {
		const t = ticket({
			$id: "t1",
			submittedAt: "2026-08-13T08:00:00.000Z",
		});
		const summary = eventSummary(
			event({
				$id: "e1",
				ticketId: "t1",
				eventType: "DEPLOYED",
				timestamp: "2026-08-13T09:01:00.000Z",
				metadata: JSON.stringify({
					reason: "We have rolled back an infrastructure change.",
				}),
			}),
			t,
		);
		expect(summary).toBe("We have rolled back an infrastructure change.");
	});

	it("uses the ticket description only for Created", () => {
		const t = ticket({
			$id: "t1",
			submittedAt: "2026-08-13T08:00:00.000Z",
			description: "Original report text",
		});

		expect(
			eventSummary(
				event({
					$id: "e1",
					ticketId: "t1",
					eventType: "CREATED",
					timestamp: "2026-08-13T08:00:00.000Z",
				}),
				t,
			),
		).toBe("Original report text");

		expect(
			eventSummary(
				event({
					$id: "e2",
					ticketId: "t1",
					eventType: "AGENT_STARTED",
					timestamp: "2026-08-13T09:00:00.000Z",
				}),
				t,
			),
		).toBe("The Cursor agent started working on a fix.");
	});

	it("uses metadata error text for Failed", () => {
		const t = ticket({
			$id: "t1",
			submittedAt: "2026-08-13T08:00:00.000Z",
			description: "Original report text",
		});

		expect(
			eventSummary(
				event({
					$id: "e3",
					ticketId: "t1",
					eventType: "FAILED",
					timestamp: "2026-08-13T09:05:00.000Z",
					metadata: JSON.stringify({ error: "Cursor agent launch failed: 429" }),
				}),
				t,
			),
		).toBe("Cursor agent launch failed: 429");
	});
});

describe("timelineIconKind", () => {
	it("uses a check for all events except failures", () => {
		expect(timelineIconKind("DEPLOYED")).toBe("check");
		expect(timelineIconKind("CREATED")).toBe("check");
		expect(timelineIconKind("FAILED")).toBe("alert");
	});
});

describe("groupTicketsByMonthDay", () => {
	it("groups resolved tickets by month then day, newest first", () => {
		const july = ticket({
			$id: "july",
			title: "July issue",
			submittedAt: "2026-07-22T12:00:00.000Z",
			resolvedAt: "2026-07-22T12:00:00.000Z",
		});
		const augA = ticket({
			$id: "aug-a",
			title: "August morning",
			submittedAt: "2026-08-13T12:00:00.000Z",
			resolvedAt: "2026-08-13T12:00:00.000Z",
		});
		const augB = ticket({
			$id: "aug-b",
			title: "August later",
			submittedAt: "2026-08-13T18:00:00.000Z",
			resolvedAt: "2026-08-13T18:00:00.000Z",
		});

		const months = groupTicketsByMonthDay([july, augA, augB], {
			july: [],
			"aug-a": [],
			"aug-b": [],
		});

		expect(months[0].monthKey).toBe("2026-08");
		expect(months[0].days[0].incidents.map((item) => item.ticket.$id)).toEqual([
			"aug-b",
			"aug-a",
		]);
		expect(months[1].monthKey).toBe("2026-07");
		expect(months[1].days[0].incidents).toHaveLength(1);
	});
});

describe("formatIssueHistoryDate", () => {
	it("formats a timestamp in the local timezone", () => {
		const formatted = formatIssueHistoryDate("2026-08-13T09:01:00.000Z");
		expect(formatted).toContain("2026");
		expect(formatted).toContain("at");
	});

	it("formats a month header", () => {
		expect(formatIssueHistoryMonth("2026-08-13T12:00:00.000Z")).toContain(
			"2026",
		);
	});
});

describe("formatVisibleMonthRange", () => {
	it("returns a single month when only one is visible", () => {
		expect(formatVisibleMonthRange([{ monthKey: "2026-08" }])).toContain("2026");
	});

	it("returns a range when multiple months are visible", () => {
		const label = formatVisibleMonthRange([
			{ monthKey: "2026-08" },
			{ monthKey: "2026-06" },
		]);
		expect(label).toContain("to");
	});
});

describe("sliceIssueHistoryMonthWindow", () => {
	it("returns three-month windows from newest-first data", () => {
		const months = [
			{ monthKey: "2026-08", label: "August 2026", days: [] },
			{ monthKey: "2026-07", label: "July 2026", days: [] },
			{ monthKey: "2026-06", label: "June 2026", days: [] },
			{ monthKey: "2026-05", label: "May 2026", days: [] },
		];

		expect(sliceIssueHistoryMonthWindow(months, 0)).toHaveLength(3);
		expect(sliceIssueHistoryMonthWindow(months, 0).map((m) => m.monthKey)).toEqual([
			"2026-08",
			"2026-07",
			"2026-06",
		]);
		expect(sliceIssueHistoryMonthWindow(months, 1)).toHaveLength(1);
		expect(issueHistoryMonthWindowCount(months.length)).toBe(2);
	});
});

describe("formatThreeMonthWindowLabel", () => {
	it("anchors a three-month label on the newest month in the window", () => {
		const label = formatThreeMonthWindowLabel([
			{ monthKey: "2026-08" },
			{ monthKey: "2026-07" },
			{ monthKey: "2026-06" },
		]);
		expect(label).toContain("to");
		expect(label).toContain("2026");
	});
});

describe("buildIssueHistoryCalendarWindows", () => {
	it("builds non-overlapping three-month blocks through 2030", () => {
		const windows = buildIssueHistoryCalendarWindows({
			oldestMonthKey: "2026-06",
		});

		expect(windows[0]?.monthKeys).toContain("2030-12");
		expect(windows[0]?.label).toContain("2030");
		expect(
			windows.some((window) => window.label === "Jun 2026 to Aug 2026"),
		).toBe(true);
	});

	it("opens on the block that contains the newest month", () => {
		const windows = buildIssueHistoryCalendarWindows({
			oldestMonthKey: "2026-06",
		});
		const index = findCalendarWindowIndexForMonth(windows, "2026-08");
		expect(windows[index]?.label).toBe("Jun 2026 to Aug 2026");
	});

	it("steps to adjacent non-overlapping blocks when navigating", () => {
		const windows = buildIssueHistoryCalendarWindows({
			oldestMonthKey: "2026-03",
		});
		const index = findCalendarWindowIndexForMonth(windows, "2026-08");
		expect(windows[index]?.label).toBe("Jun 2026 to Aug 2026");
		expect(windows[index - 1]?.label).toBe("Sep 2026 to Nov 2026");
		expect(windows[index + 1]?.label).toBe("Mar 2026 to May 2026");
	});
});

describe("buildResolvedSummary", () => {
	it("combines PR merge, CI, and deploy details", () => {
		const t = ticket({
			$id: "t1",
			submittedAt: "2026-08-13T08:00:00.000Z",
			prNumber: 42,
			prUrl: "https://github.com/org/repo/pull/42",
		});
		const summary = buildResolvedSummary(t, [
			event({
				$id: "e1",
				ticketId: "t1",
				eventType: "PR_MERGED",
				timestamp: "2026-08-13T09:00:00.000Z",
				metadata: JSON.stringify({ prNumber: 42 }),
			}),
			event({
				$id: "e2",
				ticketId: "t1",
				eventType: "CI_PASSED",
				timestamp: "2026-08-13T09:01:00.000Z",
			}),
			event({
				$id: "e3",
				ticketId: "t1",
				eventType: "DEPLOYED",
				timestamp: "2026-08-13T09:02:00.000Z",
				metadata: JSON.stringify({
					context: "Vercel – caalm-next",
					prNumber: 42,
				}),
			}),
		]);
		expect(summary).toContain("Pull request #42 was merged");
		expect(summary).toContain("All required CI checks passed.");
		expect(summary).toContain("Vercel – caalm-next");
	});
});

describe("buildIncidentTimelineSteps", () => {
	it("pins Resolved first and shows GitHub issue, Assigned to, and PR created", () => {
		const t = ticket({
			$id: "t1",
			submittedAt: "2026-08-13T08:00:00.000Z",
			resolvedAt: "2026-08-13T09:02:00.000Z",
			githubIssueUrl: "https://github.com/org/repo/issues/7",
			githubIssueNumber: 7,
			assigneeGithubLogin: "dev-user",
			prNumber: 42,
			prUrl: "https://github.com/org/repo/pull/42",
		});
		const steps = buildIncidentTimelineSteps(t, [
			event({
				$id: "e1",
				ticketId: "t1",
				eventType: "CREATED",
				timestamp: "2026-08-13T08:00:00.000Z",
			}),
			event({
				$id: "e3",
				ticketId: "t1",
				eventType: "PR_MERGED",
				timestamp: "2026-08-13T09:00:00.000Z",
				metadata: JSON.stringify({ prNumber: 42 }),
			}),
			event({
				$id: "e4",
				ticketId: "t1",
				eventType: "DEPLOYED",
				timestamp: "2026-08-13T09:02:00.000Z",
				metadata: JSON.stringify({ context: "Vercel – caalm-next" }),
			}),
			event({
				$id: "e5",
				ticketId: "t1",
				eventType: "ARCHIVED",
				timestamp: "2026-08-13T09:02:01.000Z",
			}),
		]);

		expect(steps[0].heading).toBe("Resolved");
		expect(steps[0].body).toContain("Vercel – caalm-next");
		expect(steps.map((step) => step.heading)).toEqual(
			expect.arrayContaining([
				"GitHub issue",
				"Assigned to",
				"PR created",
				"Resolved",
			]),
		);
		expect(
			steps.find((step) => step.heading === "Assigned to")?.body,
		).toContain("@dev-user");
		expect(
			steps.find((step) => step.heading === "PR created")?.links?.[0]?.label,
		).toBe("PR #42");
		expect(steps.find((step) => step.heading === "GitHub issue")?.links).toBeUndefined();
		expect(steps.find((step) => step.heading === "GitHub issue")?.externalHref).toBe(
			"https://github.com/org/repo/issues/7",
		);
	});

	it("keeps Resolved first even when other steps have later timestamps", () => {
		const t = ticket({
			$id: "t1",
			submittedAt: "2026-08-13T08:00:00.000Z",
			resolvedAt: "2026-08-13T09:02:00.000Z",
			githubIssueNumber: 7,
			githubRepo: "org/repo",
		});
		const steps = buildIncidentTimelineSteps(t, [
			event({
				$id: "e1",
				ticketId: "t1",
				eventType: "CREATED",
				timestamp: "2026-08-13T10:00:00.000Z",
			}),
			event({
				$id: "e2",
				ticketId: "t1",
				eventType: "DEPLOYED",
				timestamp: "2026-08-13T09:02:00.000Z",
			}),
		]);

		expect(steps[0].heading).toBe("Resolved");
		expect(steps.map((step) => step.heading)).toContain("PR created");
	});

	it("shows PR created for resolved tickets even when no PR URL was stored", () => {
		const t = ticket({
			$id: "t1",
			submittedAt: "2026-08-13T08:00:00.000Z",
			resolvedAt: "2026-08-13T09:02:00.000Z",
			githubIssueNumber: 7,
			githubRepo: "org/repo",
		});
		const steps = buildIncidentTimelineSteps(t, [
			event({
				$id: "e1",
				ticketId: "t1",
				eventType: "CREATED",
				timestamp: "2026-08-13T08:00:00.000Z",
			}),
			event({
				$id: "e2",
				ticketId: "t1",
				eventType: "DEPLOYED",
				timestamp: "2026-08-13T09:02:00.000Z",
			}),
		]);
		const prCreated = steps.find((step) => step.heading === "PR created");
		expect(prCreated).toBeTruthy();
		expect(prCreated?.body).toBe("A pull request was created for review.");
	});
});

describe("getIncidentTimelineResourceLinks", () => {
	it("returns the merged PR link from ticket fields", () => {
		const t = ticket({
			$id: "t1",
			submittedAt: "2026-08-13T08:00:00.000Z",
			githubIssueUrl: "https://github.com/org/repo/issues/7",
			githubIssueNumber: 7,
			prUrl: "https://github.com/org/repo/pull/42",
			prNumber: 42,
		});

		expect(getIncidentTimelineResourceLinks(t, [])).toEqual([
			{
				href: "https://github.com/org/repo/issues/7",
				label: "GitHub issue",
				kind: "github-issue",
			},
			{
				href: "https://github.com/org/repo/pull/42",
				label: "Merged PR",
				kind: "merged-pr",
			},
		]);
	});
});
