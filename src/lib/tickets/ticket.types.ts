export const TICKET_STATUSES = [
	"OPEN",
	"ASSIGNED",
	"IN_PROGRESS",
	"PR_OPEN",
	"IN_REVIEW",
	"RESOLVED",
	"FAILED",
	"NEEDS_HUMAN",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const ACTIVE_TICKET_STATUSES: TicketStatus[] = [
	"OPEN",
	"ASSIGNED",
	"IN_PROGRESS",
	"PR_OPEN",
	"IN_REVIEW",
	"FAILED",
	"NEEDS_HUMAN",
];

export const TICKET_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type TicketSeverity = (typeof TICKET_SEVERITIES)[number];

export const TICKET_EVENT_TYPES = [
	"CREATED",
	"ISSUE_CREATED",
	"ASSIGNED",
	"RESOLVE_CLICKED",
	"AGENT_STARTED",
	"PR_OPENED",
	"PR_MERGED",
	"CI_PASSED",
	"ARCHIVED",
	"FAILED",
	"NEEDS_HUMAN",
] as const;

export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export type Ticket = {
	$id: string;
	title: string;
	description: string;
	category?: string;
	affectedModule?: string | null;
	impact?: TicketSeverity;
	urgency?: TicketSeverity;
	submittedByUserId: string;
	submittedByName: string;
	department: string;
	submittedAt: string;
	severity: TicketSeverity;
	status: TicketStatus;
	githubIssueNumber?: number | null;
	githubIssueUrl?: string | null;
	githubRepo?: string | null;
	assigneeGithubLogin?: string | null;
	assigneeCaalmUserId?: string | null;
	prNumber?: number | null;
	prUrl?: string | null;
	resolvedAt?: string | null;
	attachments?: string[];
	orgId: string;
	cursorAgentRunId?: string | null;
	$createdAt?: string;
	$updatedAt?: string;
};

export type TicketEvent = {
	$id: string;
	ticketId: string;
	eventType: TicketEventType;
	actor: string;
	timestamp: string;
	metadata?: string | null;
	$createdAt?: string;
};

export type CreateTicketInput = {
	title: string;
	description: string;
	category: string;
	affectedModule?: string | null;
	impact: TicketSeverity;
	urgency: TicketSeverity;
	severity: TicketSeverity;
	attachmentIds?: string[];
};

export type GitHubIssueSnapshot = {
	number: number;
	title: string;
	body: string;
	htmlUrl: string;
	state: string;
	labels: string[];
	assignees: string[];
	comments: Array<{
		id: number;
		author: string;
		body: string;
		createdAt: string;
	}>;
};

export function isTicketsEnabled(): boolean {
	return process.env.TICKETS_ENABLED === "true";
}

export function getTicketsRepo(): string {
	return process.env.GITHUB_TICKETS_REPO || "Remiiiiii/caalm-next";
}
