import {
	buildGitHubIssueBody,
	createGitHubIssue,
} from "./github-tickets.service";
import { getTicketById, updateTicket } from "./ticket.repository";
import {
	getTicketsRepo,
	isTicketsEnabled,
	resolveTicketLane,
	type Ticket,
} from "./ticket.types";
import { canEscalateTicket } from "./ticket-access.policy";
import { appendTicketEvent } from "./ticket-events.repository";
import { slugLabel } from "./ticket-intake.service";
import { notifyTicketStaff } from "./ticket-notification.service";

/**
 * Help → Engineering: set lane, create GitHub issue so Start fix agent can run.
 */
export async function escalateTicket(input: {
	ticketId: string;
	actorId: string;
	permissions: string[];
}): Promise<Ticket> {
	const ticket = await getTicketById(input.ticketId);
	if (!ticket) {
		throw new Error("Ticket not found");
	}
	if (
		!canEscalateTicket(ticket, {
			userId: input.actorId,
			permissions: input.permissions,
		})
	) {
		throw new Error("Not allowed to escalate this ticket");
	}
	if (resolveTicketLane(ticket) !== "help") {
		throw new Error("Only Help tickets can be escalated");
	}
	if (ticket.status === "RESOLVED") {
		throw new Error("Ticket is already resolved");
	}

	let updated = await updateTicket(ticket.$id, {
		lane: "engineering",
		assigneeCaalmUserId: ticket.assigneeCaalmUserId || input.actorId,
		status:
			ticket.status === "OPEN" || ticket.status === "ASSIGNED"
				? "ASSIGNED"
				: ticket.status,
	});

	await appendTicketEvent({
		ticketId: updated.$id,
		eventType: "ESCALATED",
		actor: input.actorId,
		metadata: { fromLane: "help", toLane: "engineering" },
	});

	if (!isTicketsEnabled()) {
		return updated;
	}

	if (updated.githubIssueNumber) {
		return updated;
	}

	const issue = await createGitHubIssue({
		title: updated.title,
		body: buildGitHubIssueBody({
			name: updated.submittedByName,
			userId: updated.submittedByUserId,
			department: updated.department,
			submittedAt: updated.submittedAt,
			severity: updated.severity,
			category: updated.category || "Other",
			affectedModule: updated.affectedModule,
			impact: updated.impact || updated.severity,
			urgency: updated.urgency || updated.severity,
			description: updated.description,
			ticketId: updated.$id,
			ticketNumber: updated.ticketNumber,
		}),
		labels: [
			"source:caalm-ticket",
			"lane:engineering",
			"escalated-from-help",
			`dept:${slugLabel(updated.department)}`,
			`severity:${updated.severity}`,
			`category:${slugLabel(updated.category || "Other")}`,
		],
	});

	updated = await updateTicket(updated.$id, {
		githubIssueNumber: issue.number,
		githubIssueUrl: issue.htmlUrl,
		githubRepo: issue.repo || getTicketsRepo(),
	});

	await appendTicketEvent({
		ticketId: updated.$id,
		eventType: "ISSUE_CREATED",
		actor: input.actorId,
		metadata: {
			githubIssueNumber: issue.number,
			githubIssueUrl: issue.htmlUrl,
			via: "escalate",
		},
	});

	try {
		await notifyTicketStaff({ ticket: updated, kind: "issue_created" });
	} catch (error) {
		console.warn("[tickets] notify on escalate failed", error);
	}

	return updated;
}
