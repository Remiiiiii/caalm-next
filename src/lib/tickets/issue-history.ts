import type { Ticket, TicketEvent, TicketEventType } from "./ticket.types";

export type IssueHistoryIncident = {
	ticket: Ticket;
	events: TicketEvent[];
	latestEvent: TicketEvent | null;
};

export type IssueHistoryDayGroup = {
	dayKey: string;
	label: string;
	incidents: IssueHistoryIncident[];
};

export type IssueHistoryMonthGroup = {
	monthKey: string;
	label: string;
	days: IssueHistoryDayGroup[];
};

const EVENT_LABELS: Record<TicketEventType, string> = {
	CREATED: "Created",
	ISSUE_CREATED: "GitHub issue",
	ASSIGNED: "Assigned to",
	RESOLVE_CLICKED: "Resolve started",
	AGENT_STARTED: "Agent started",
	PR_OPENED: "PR created",
	PR_MERGED: "Pull request merged",
	CI_PASSED: "CI passed",
	DEPLOYED: "Resolved",
	ARCHIVED: "Archived",
	FAILED: "Failed",
	NEEDS_HUMAN: "Needs human",
};

export function parseEventMetadata(
	metadata: string | null | undefined,
): Record<string, unknown> | null {
	if (!metadata) return null;
	try {
		const parsed = JSON.parse(metadata) as unknown;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		return null;
	}
	return null;
}

export function incidentSortDate(ticket: Ticket): Date {
	const raw = ticket.resolvedAt || ticket.submittedAt;
	const date = new Date(raw);
	return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

/** Local timezone, e.g. "Aug 13, 2026 at 5:01 AM EDT". */
export function formatIssueHistoryDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	const datePart = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
	const timePart = new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
		timeZoneName: "short",
	}).format(date);
	return `${datePart} at ${timePart}`;
}

/** Local day label, e.g. "Aug 13, 2026". */
export function formatIssueHistoryDay(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

/** Local month header, e.g. "August 2026". */
export function formatIssueHistoryMonth(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat(undefined, {
		month: "long",
		year: "numeric",
	}).format(date);
}

function localMonthKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

function localDayKey(date: Date): string {
	const day = String(date.getDate()).padStart(2, "0");
	return `${localMonthKey(date)}-${day}`;
}

export function getLatestEvent(events: TicketEvent[]): TicketEvent | null {
	if (events.length === 0) return null;
	return [...events].sort(
		(a, b) =>
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	)[0];
}

export function humanizeEventType(type: string): string {
	return (
		EVENT_LABELS[type as TicketEventType] || type.replaceAll("_", " ")
	);
}

const EVENT_SUMMARY_COPY: Record<TicketEventType, string> = {
	CREATED: "The issue was reported.",
	ISSUE_CREATED: "A linked GitHub issue was opened for this ticket.",
	ASSIGNED: "This issue was assigned for investigation.",
	RESOLVE_CLICKED: "Automated resolve was started for this ticket.",
	AGENT_STARTED: "The Cursor agent started working on a fix.",
	PR_OPENED: "A pull request was created for review.",
	PR_MERGED: "The pull request was merged.",
	CI_PASSED: "Checks passed after the pull request merged.",
	DEPLOYED: "The change was deployed and this issue is resolved.",
	ARCHIVED: "The GitHub issue was archived after resolution.",
	FAILED: "The automated fix failed and needs a closer look.",
	NEEDS_HUMAN: "This issue was flagged for a person to finish.",
};

const RESOLUTION_CLUSTER_EVENT_TYPES: TicketEventType[] = [
	"CI_PASSED",
	"DEPLOYED",
	"ARCHIVED",
];

export type TimelineIconKind = "check" | "alert";

/** Circle check for all events except failures (AlertCircle). */
export function timelineIconKind(eventType: string): TimelineIconKind {
	if (eventType === "FAILED") {
		return "alert";
	}
	return "check";
}

function defaultEventSummary(
	eventType: TicketEventType,
	metadata: Record<string, unknown> | null,
	ticket?: Ticket,
): string {
	switch (eventType) {
		case "ISSUE_CREATED": {
			const issueNumber =
				asPositiveInt(metadata?.githubIssueNumber) ??
				asPositiveInt(ticket?.githubIssueNumber);
			if (issueNumber) {
				return `GitHub issue #${issueNumber} was opened for this ticket.`;
			}
			return EVENT_SUMMARY_COPY.ISSUE_CREATED;
		}
		case "ASSIGNED": {
			const assignee =
				(typeof metadata?.assigneeGithubLogin === "string" &&
					metadata.assigneeGithubLogin.trim()) ||
				ticket?.assigneeGithubLogin?.trim() ||
				"";
			if (assignee) {
				return `@${assignee} was assigned on GitHub to investigate and resolve this issue.`;
			}
			return EVENT_SUMMARY_COPY.ASSIGNED;
		}
		case "RESOLVE_CLICKED": {
			const attachmentNames = metadata?.attachmentNames;
			if (Array.isArray(attachmentNames) && attachmentNames.length > 0) {
				return `Resolve started with ${attachmentNames.length} attached file${attachmentNames.length === 1 ? "" : "s"}.`;
			}
			if (metadata?.hasInstructions === true) {
				return "Resolve started with additional instructions for the agent.";
			}
			return EVENT_SUMMARY_COPY.RESOLVE_CLICKED;
		}
		case "AGENT_STARTED":
			return EVENT_SUMMARY_COPY.AGENT_STARTED;
		case "PR_OPENED": {
			const prNumber =
				ticket?.prNumber ??
				(typeof metadata?.prNumber === "number" ? metadata.prNumber : null);
			if (typeof prNumber === "number") {
				return `Pull request #${prNumber} was created and is ready for review.`;
			}
			if (typeof metadata?.prUrl === "string" && metadata.prUrl.trim()) {
				return "A pull request was created and is ready for review.";
			}
			return EVENT_SUMMARY_COPY.PR_OPENED;
		}
		case "PR_MERGED": {
			const prNumber = metadata?.prNumber;
			if (typeof prNumber === "number") {
				return `Pull request #${prNumber} was merged.`;
			}
			return EVENT_SUMMARY_COPY.PR_MERGED;
		}
		case "CI_PASSED":
			return EVENT_SUMMARY_COPY.CI_PASSED;
		case "DEPLOYED": {
			const context = metadata?.context;
			if (typeof context === "string" && context.trim()) {
				return `Deployment succeeded (${context.trim()}).`;
			}
			return EVENT_SUMMARY_COPY.DEPLOYED;
		}
		case "ARCHIVED":
			return EVENT_SUMMARY_COPY.ARCHIVED;
		case "NEEDS_HUMAN": {
			const cursorStatus = metadata?.cursorStatus;
			if (typeof cursorStatus === "string" && cursorStatus.trim()) {
				return `The agent stopped with status ${cursorStatus.trim()}. A person needs to take over.`;
			}
			return EVENT_SUMMARY_COPY.NEEDS_HUMAN;
		}
		case "FAILED":
			return EVENT_SUMMARY_COPY.FAILED;
		case "CREATED":
			return EVENT_SUMMARY_COPY.CREATED;
		default:
			return humanizeEventType(eventType);
	}
}

export function eventSummary(
	event: TicketEvent | null,
	ticket: Ticket,
): string {
	if (!event) {
		return ticket.description?.trim() || "No updates yet.";
	}
	const meta = parseEventMetadata(event.metadata);
	const reason = typeof meta?.reason === "string" ? meta.reason.trim() : "";
	const error = typeof meta?.error === "string" ? meta.error.trim() : "";
	if (reason) return reason;
	if (error) return error;

	if (event.eventType === "CREATED") {
		return ticket.description?.trim() || EVENT_SUMMARY_COPY.CREATED;
	}

	return defaultEventSummary(event.eventType, meta, ticket);
}

export type IncidentTimelineStep = {
	id: string;
	heading: string;
	timestamp: string;
	body: string;
	iconKind: TimelineIconKind;
	externalHref?: string;
	links?: Array<{ href: string; label: string }>;
};

function offsetTimestamp(iso: string, deltaMs: number): string {
	return new Date(new Date(iso).getTime() + deltaMs).toISOString();
}

function githubIssueUrl(
	ticket: Ticket,
	github: { url?: string; number?: number | null },
): string | undefined {
	if (github.url) return github.url;
	if (typeof github.number === "number" && ticket.githubRepo?.trim()) {
		return `https://github.com/${ticket.githubRepo.trim()}/issues/${github.number}`;
	}
	return undefined;
}

function githubIssueFrom(
	ticket: Ticket,
	events: TicketEvent[],
): { url?: string; number?: number | null } {
	const url = ticket.githubIssueUrl?.trim();
	const number = ticket.githubIssueNumber ?? null;
	if (url || number) {
		return { url: url || undefined, number };
	}

	for (const entry of events) {
		if (entry.eventType !== "ISSUE_CREATED") continue;
		const meta = parseEventMetadata(entry.metadata);
		const issueNumber = meta?.githubIssueNumber;
		if (typeof issueNumber === "number") {
			return { number: issueNumber };
		}
	}

	return {};
}

function assigneeLoginFrom(
	ticket: Ticket,
	events: TicketEvent[],
): string | null {
	if (ticket.assigneeGithubLogin?.trim()) {
		return ticket.assigneeGithubLogin.trim();
	}

	for (const entry of events) {
		if (entry.eventType !== "ASSIGNED") continue;
		const meta = parseEventMetadata(entry.metadata);
		const login = meta?.assigneeGithubLogin;
		if (typeof login === "string" && login.trim()) {
			return login.trim();
		}
	}

	return null;
}

function asPositiveInt(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}
	if (typeof value === "string" && /^\d+$/.test(value.trim())) {
		return Number(value.trim());
	}
	return null;
}

function pullRequestFrom(
	ticket: Ticket,
	events: TicketEvent[],
): { url?: string; number?: number | null } {
	if (ticket.prUrl?.trim()) {
		return {
			url: ticket.prUrl.trim(),
			number: asPositiveInt(ticket.prNumber),
		};
	}

	const ticketNumber = asPositiveInt(ticket.prNumber);
	if (ticketNumber) {
		return { number: ticketNumber };
	}

	for (const entry of events) {
		const meta = parseEventMetadata(entry.metadata);
		const url =
			typeof meta?.prUrl === "string" && meta.prUrl.trim()
				? meta.prUrl.trim()
				: undefined;
		const number = asPositiveInt(meta?.prNumber);
		if (url || number) return { url, number };
	}

	return {};
}

function githubPullRequestUrl(
	ticket: Ticket,
	prNumber: number | null | undefined,
): string | undefined {
	if (ticket.prUrl?.trim()) return ticket.prUrl.trim();
	if (typeof prNumber !== "number" || !ticket.githubRepo?.trim()) return undefined;
	return `https://github.com/${ticket.githubRepo.trim()}/pull/${prNumber}`;
}

function prNumberFromEvents(ticket: Ticket, events: TicketEvent[]): number | null {
	const pr = pullRequestFrom(ticket, events);
	return typeof pr.number === "number" ? pr.number : null;
}

function ensureMandatoryTimelineEvents(
	ticket: Ticket,
	displayEvents: TicketEvent[],
	allEvents: TicketEvent[],
): TicketEvent[] {
	const events = [...displayEvents];
	const github = githubIssueFrom(ticket, allEvents);

	if (
		(github.url || github.number) &&
		!events.some((entry) => entry.eventType === "ISSUE_CREATED")
	) {
		events.push({
			$id: "synthetic-github-issue",
			ticketId: ticket.$id,
			eventType: "ISSUE_CREATED",
			actor: "system",
			timestamp: offsetTimestamp(ticket.submittedAt, 60_000),
			metadata: JSON.stringify({
				githubIssueNumber: github.number,
			}),
		});
	}

	const assignee = assigneeLoginFrom(ticket, allEvents);
	if (assignee && !events.some((entry) => entry.eventType === "ASSIGNED")) {
		const issueCreated = events.find(
			(entry) => entry.eventType === "ISSUE_CREATED",
		);
		events.push({
			$id: "synthetic-assigned",
			ticketId: ticket.$id,
			eventType: "ASSIGNED",
			actor: "system",
			timestamp: issueCreated
				? offsetTimestamp(issueCreated.timestamp, 60_000)
				: offsetTimestamp(ticket.submittedAt, 120_000),
			metadata: JSON.stringify({ assigneeGithubLogin: assignee }),
		});
	}

	const pr = pullRequestFrom(ticket, allEvents);
	const hasPrMerged = events.some((entry) => entry.eventType === "PR_MERGED");
	const shouldShowPrCreated =
		ticket.status === "RESOLVED" ||
		ticket.status === "PR_OPEN" ||
		ticket.status === "IN_REVIEW" ||
		Boolean(pr.url || pr.number || hasPrMerged);
	if (
		!events.some((entry) => entry.eventType === "PR_OPENED") &&
		shouldShowPrCreated
	) {
		const prMerged = events.find((entry) => entry.eventType === "PR_MERGED");
		const agentStarted = events.find(
			(entry) => entry.eventType === "AGENT_STARTED",
		);
		const anchor = prMerged ?? agentStarted;
		events.push({
			$id: "synthetic-pr-opened",
			ticketId: ticket.$id,
			eventType: "PR_OPENED",
			actor: "ai-agent",
			timestamp: anchor
				? offsetTimestamp(anchor.timestamp, prMerged ? -3_600_000 : 0)
				: ticket.resolvedAt || ticket.submittedAt,
			metadata: JSON.stringify({
				prUrl: githubPullRequestUrl(ticket, pr.number),
				prNumber: pr.number,
			}),
		});
	}

	return events;
}

/** Detailed resolve copy for the final timeline step. */
export function buildResolvedSummary(
	ticket: Ticket,
	events: TicketEvent[],
): string {
	const resolveCluster = events.filter((entry) =>
		RESOLUTION_CLUSTER_EVENT_TYPES.includes(entry.eventType),
	);
	const sentences: string[] = [];
	const prNumber = prNumberFromEvents(ticket, events);

	if (typeof prNumber === "number") {
		sentences.push(
			`Pull request #${prNumber} was merged into the main branch.`,
		);
	} else if (ticket.prUrl?.trim()) {
		sentences.push("The fix pull request was merged into the main branch.");
	}

	if (resolveCluster.some((entry) => entry.eventType === "CI_PASSED")) {
		sentences.push("All required CI checks passed.");
	}

	const deployed = resolveCluster.find((entry) => entry.eventType === "DEPLOYED");
	if (deployed) {
		const meta = parseEventMetadata(deployed.metadata);
		const context =
			typeof meta?.context === "string" ? meta.context.trim() : "";
		if (context) {
			sentences.push(
				`Production deployment completed successfully (${context}).`,
			);
		} else {
			sentences.push("The change was deployed to production.");
		}
	} else if (resolveCluster.some((entry) => entry.eventType === "CI_PASSED")) {
		sentences.push("The issue is closed after verification.");
	}

	if (sentences.length === 0) {
		return "This issue was marked resolved and is no longer affecting production.";
	}

	return sentences.join(" ");
}

function timelineLinksForEvent(
	event: TicketEvent,
	ticket: Ticket,
	allEvents: TicketEvent[],
): IncidentTimelineStep["links"] {
	const links: NonNullable<IncidentTimelineStep["links"]> = [];

	if (event.eventType === "PR_OPENED" || event.eventType === "PR_MERGED") {
		const pr = pullRequestFrom(ticket, allEvents);
		const href = githubPullRequestUrl(ticket, pr.number) || pr.url;
		if (href) {
			links.push({
				href,
				label:
					typeof pr.number === "number"
						? `PR #${pr.number}`
						: "View pull request",
			});
		}
	}

	return links.length > 0 ? links : undefined;
}

export type IncidentTimelineResourceLink = {
	href: string;
	label: string;
	kind: "github-issue" | "merged-pr";
};

function githubIssueHref(
	ticket: Ticket,
	allEvents: TicketEvent[],
): string | undefined {
	return githubIssueUrl(ticket, githubIssueFrom(ticket, allEvents));
}

/** GitHub section links: issue + merged PR. Never drop the issue link. */
export function getIncidentTimelineResourceLinks(
	ticket: Ticket,
	events: TicketEvent[],
): IncidentTimelineResourceLink[] {
	const links: IncidentTimelineResourceLink[] = [];
	const issueHref = githubIssueHref(ticket, events);
	if (issueHref) {
		links.push({
			href: issueHref,
			label: "GitHub issue",
			kind: "github-issue",
		});
	}

	const pr = pullRequestFrom(ticket, events);
	const prHref = githubPullRequestUrl(ticket, pr.number) || pr.url;
	if (prHref) {
		links.push({
			href: prHref,
			label: "Merged PR",
			kind: "merged-pr",
		});
	}

	return links;
}

/**
 * Incident detail timeline: explicit GitHub issue, Assigned to, PR created, and a
 * pinned Resolved entry first (newest / final step).
 */
export function buildIncidentTimelineSteps(
	ticket: Ticket,
	events: TicketEvent[],
): IncidentTimelineStep[] {
	const allEvents = [...events];
	const displayEvents = ensureMandatoryTimelineEvents(
		ticket,
		allEvents.filter(
			(entry) => !RESOLUTION_CLUSTER_EVENT_TYPES.includes(entry.eventType),
		),
		allEvents,
	);

	const githubHref = githubIssueHref(ticket, allEvents);
	const middleSteps: IncidentTimelineStep[] = displayEvents
		.map((event) => ({
			id: event.$id,
			heading: humanizeEventType(event.eventType),
			timestamp: event.timestamp,
			body: eventSummary(event, ticket),
			iconKind: timelineIconKind(event.eventType),
			externalHref:
				event.eventType === "ISSUE_CREATED" ? githubHref : undefined,
			links: timelineLinksForEvent(event, ticket, allEvents),
		}))
		.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
		);

	if (ticket.status !== "RESOLVED") {
		return middleSteps;
	}

	const resolvedAt =
		ticket.resolvedAt ||
		getLatestEvent(
			allEvents.filter((entry) =>
				RESOLUTION_CLUSTER_EVENT_TYPES.includes(entry.eventType),
			),
		)?.timestamp ||
		getLatestEvent(allEvents)?.timestamp ||
		ticket.submittedAt;

	const resolvedStep: IncidentTimelineStep = {
		id: "synthetic-resolved",
		heading: "Resolved",
		timestamp: resolvedAt,
		body: buildResolvedSummary(ticket, allEvents),
		iconKind: "check",
	};

	return [resolvedStep, ...middleSteps];
}

export function affectedService(ticket: Ticket): string {
	return ticket.affectedModule || ticket.category || ticket.department;
}

/** Short month label from YYYY-MM key, e.g. "Aug 2026". */
export function formatShortMonthKey(monthKey: string): string {
	const [year, month] = monthKey.split("-");
	const date = new Date(Number(year), Number(month) - 1, 1);
	if (Number.isNaN(date.getTime())) return monthKey;
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		year: "numeric",
	}).format(date);
}

/** Range label for a slice of month groups, e.g. "Jun 2026 to Aug 2026". */
export function formatVisibleMonthRange(
	months: Pick<IssueHistoryMonthGroup, "monthKey">[],
): string | null {
	if (months.length === 0) return null;
	const keys = months.map((m) => m.monthKey).sort();
	const start = formatShortMonthKey(keys[0]);
	const end = formatShortMonthKey(keys[keys.length - 1]);
	if (start === end) return start;
	return `${start} to ${end}`;
}

export const ISSUE_HISTORY_MONTH_WINDOW = 3;
export const ISSUE_HISTORY_RANGE_END_YEAR = 2030;
export const ISSUE_HISTORY_RANGE_END_MONTH = 12;

export type IssueHistoryCalendarWindow = {
	monthKeys: [string, string, string];
	label: string;
};

function monthKeyFromParts(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, "0")}`;
}

function compareCalendarMonth(
	a: { year: number; month: number },
	b: { year: number; month: number },
): number {
	if (a.year !== b.year) return a.year - b.year;
	return a.month - b.month;
}

/** Which fixed block contains this calendar month? */
export function findBlockEndContainingMonth(
	year: number,
	month: number,
): { year: number; month: number } {
	if (month >= 3 && month <= 5) return { year, month: 5 };
	if (month >= 6 && month <= 8) return { year, month: 8 };
	if (month >= 9 && month <= 11) return { year, month: 11 };
	if (month === 12) return { year: year + 1, month: 2 };
	return { year, month: 2 };
}

function stepBlockEndBackward(
	endYear: number,
	endMonth: number,
): { year: number; month: number } {
	switch (endMonth) {
		case 2:
			return { year: endYear - 1, month: 11 };
		case 5:
			return { year: endYear, month: 2 };
		case 8:
			return { year: endYear, month: 5 };
		case 11:
			return { year: endYear, month: 8 };
		default:
			return findBlockEndContainingMonth(endYear, endMonth);
	}
}

/** Three consecutive calendar months ending at year/month, e.g. Jun–Aug 2026. */
export function threeMonthKeysEndAt(
	endYear: number,
	endMonth: number,
): [string, string, string] {
	const keys: string[] = [];
	for (let offset = 2; offset >= 0; offset -= 1) {
		let month = endMonth - offset;
		let year = endYear;
		while (month <= 0) {
			month += 12;
			year -= 1;
		}
		keys.push(monthKeyFromParts(year, month));
	}
	return keys as [string, string, string];
}

/** Always returns a 3-month span label, e.g. "Jun 2026 to Aug 2026". */
export function formatCalendarThreeMonthLabel(
	endYear: number,
	endMonth: number,
): string {
	const keys = threeMonthKeysEndAt(endYear, endMonth);
	const start = formatShortMonthKey(keys[0]);
	const end = formatShortMonthKey(keys[2]);
	if (start === end) return start;
	return `${start} to ${end}`;
}

/**
 * Non-overlapping three-month blocks from the oldest data month through 2030.
 * Newest block first (index 0 = closest to 2030).
 */
export function buildIssueHistoryCalendarWindows(options?: {
	oldestMonthKey?: string | null;
	endYear?: number;
	endMonth?: number;
}): IssueHistoryCalendarWindow[] {
	const limitYear = options?.endYear ?? ISSUE_HISTORY_RANGE_END_YEAR;
	const limitMonth = options?.endMonth ?? ISSUE_HISTORY_RANGE_END_MONTH;

	let minBlockEnd = findBlockEndContainingMonth(2020, 1);
	if (options?.oldestMonthKey) {
		const [year, month] = options.oldestMonthKey.split("-").map(Number);
		if (year && month) {
			minBlockEnd = findBlockEndContainingMonth(year, month);
		}
	}

	const maxBlockEnd = findBlockEndContainingMonth(limitYear, limitMonth);
	const windows: IssueHistoryCalendarWindow[] = [];
	let endYear = maxBlockEnd.year;
	let endMonth = maxBlockEnd.month;

	while (
		compareCalendarMonth({ year: endYear, month: endMonth }, minBlockEnd) >= 0
	) {
		windows.push({
			monthKeys: threeMonthKeysEndAt(endYear, endMonth),
			label: formatCalendarThreeMonthLabel(endYear, endMonth),
		});
		const stepped = stepBlockEndBackward(endYear, endMonth);
		endYear = stepped.year;
		endMonth = stepped.month;
	}

	return windows;
}

export function findCalendarWindowIndexForMonth(
	windows: IssueHistoryCalendarWindow[],
	monthKey: string | null | undefined,
): number {
	if (!monthKey) return 0;
	const index = windows.findIndex((window) => window.monthKeys.includes(monthKey));
	return index >= 0 ? index : 0;
}

/** Paginate newest-first month groups in fixed-size windows (default 3 months). */
export function sliceIssueHistoryMonthWindow(
	months: IssueHistoryMonthGroup[],
	windowIndex: number,
	windowSize = ISSUE_HISTORY_MONTH_WINDOW,
): IssueHistoryMonthGroup[] {
	const start = windowIndex * windowSize;
	return months.slice(start, start + windowSize);
}

export function issueHistoryMonthWindowCount(
	monthCount: number,
	windowSize = ISSUE_HISTORY_MONTH_WINDOW,
): number {
	if (monthCount === 0) return 0;
	return Math.ceil(monthCount / windowSize);
}

/**
 * Label for a 3-month navigation window anchored on the newest month in the slice,
 * e.g. "Jun 2026 to Aug 2026".
 */
export function formatThreeMonthWindowLabel(
	windowMonths: Pick<IssueHistoryMonthGroup, "monthKey">[],
	windowSize = ISSUE_HISTORY_MONTH_WINDOW,
): string | null {
	if (windowMonths.length === 0) return null;

	const newestKey = windowMonths
		.map((month) => month.monthKey)
		.sort()
		.at(-1);
	if (!newestKey) return null;

	const [year, month] = newestKey.split("-").map(Number);
	if (!year || !month) return formatVisibleMonthRange(windowMonths);

	return formatCalendarThreeMonthLabel(year, month);
}

export function formatMonthRange(tickets: Ticket[]): string | null {
	if (tickets.length === 0) return null;
	const dates = tickets.map(incidentSortDate).sort((a, b) => a.getTime() - b.getTime());
	const oldest = dates[0];
	const newest = dates[dates.length - 1];
	const start = new Intl.DateTimeFormat(undefined, {
		month: "short",
		year: "numeric",
	}).format(oldest);
	const end = new Intl.DateTimeFormat(undefined, {
		month: "short",
		year: "numeric",
	}).format(newest);
	if (start === end) return start;
	return `${start} to ${end}`;
}

export function groupTicketsByMonthDay(
	tickets: Ticket[],
	eventsByTicket: Record<string, TicketEvent[]>,
): IssueHistoryMonthGroup[] {
	const sorted = [...tickets].sort(
		(a, b) => incidentSortDate(b).getTime() - incidentSortDate(a).getTime(),
	);

	const months = new Map<string, IssueHistoryMonthGroup>();

	for (const ticket of sorted) {
		const date = incidentSortDate(ticket);
		const monthKey = localMonthKey(date);
		const dayKey = localDayKey(date);
		const events = eventsByTicket[ticket.$id] || [];
		const incident: IssueHistoryIncident = {
			ticket,
			events,
			latestEvent: getLatestEvent(events),
		};

		let month = months.get(monthKey);
		if (!month) {
			month = {
				monthKey,
				label: formatIssueHistoryMonth(date.toISOString()),
				days: [],
			};
			months.set(monthKey, month);
		}

		let day = month.days.find((entry) => entry.dayKey === dayKey);
		if (!day) {
			day = {
				dayKey,
				label: formatIssueHistoryDay(date.toISOString()),
				incidents: [],
			};
			month.days.push(day);
		}
		day.incidents.push(incident);
	}

	return Array.from(months.values());
}
