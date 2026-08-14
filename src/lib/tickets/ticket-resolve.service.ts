import { appendTicketEvent } from "./ticket-events.repository";
import { notifyTicketStaff } from "./ticket-notification.service";
import { getTicketById, listTickets, updateTicket } from "./ticket.repository";
import { canResolveTicket } from "./ticket-access.policy";
import {
	getCursorAgentStatus,
	launchCursorAgent,
	parsePrNumberFromUrl,
} from "./cursor-agent.service";
import { fetchGitHubIssue } from "./github-tickets.service";
import { uploadTicketAttachments } from "./ticket-intake.service";
import type { Ticket } from "./ticket.types";

export async function resolveTicket(input: {
	ticketId: string;
	actorId: string;
	permissions: string[];
	instructions?: string;
	/** Extra files attached on Resolve (screenshots, notes, etc.) */
	attachmentFiles?: File[];
}): Promise<Ticket> {
	const ticket = await getTicketById(input.ticketId);
	if (!ticket) {
		throw new Error("Ticket not found");
	}
	if (!canResolveTicket(ticket, { userId: input.actorId, permissions: input.permissions })) {
		throw new Error("Not allowed to resolve this ticket");
	}
	if (!ticket.githubIssueNumber) {
		throw new Error("Ticket has no GitHub issue yet");
	}

	const issue = await fetchGitHubIssue(
		ticket.githubIssueNumber,
		ticket.githubRepo || undefined,
	);

	const attachmentFiles = input.attachmentFiles?.slice(0, 5) || [];
	const uploadedIds =
		attachmentFiles.length > 0
			? await uploadTicketAttachments(attachmentFiles)
			: [];
	const attachmentNames = attachmentFiles.map((file) => file.name);

	let instructions = input.instructions?.trim() || undefined;
	if (attachmentNames.length > 0) {
		const fileNote = `Attached context files: ${attachmentNames.join(", ")}`;
		instructions = instructions ? `${instructions}\n\n${fileNote}` : fileNote;
	}

	if (uploadedIds.length > 0) {
		const existing = Array.isArray(ticket.attachments) ? ticket.attachments : [];
		await updateTicket(ticket.$id, {
			attachments: [...existing, ...uploadedIds],
		});
	}

	await appendTicketEvent({
		ticketId: ticket.$id,
		eventType: "RESOLVE_CLICKED",
		actor: input.actorId,
		metadata: {
			githubIssueNumber: issue.number,
			...(instructions ? { hasInstructions: true } : {}),
			...(uploadedIds.length
				? { attachmentIds: uploadedIds, attachmentNames }
				: {}),
		},
	});

	let agentId: string | null = null;
	try {
		const agent = await launchCursorAgent({
			issueNumber: issue.number,
			issueUrl: issue.htmlUrl,
			issueTitle: issue.title,
			issueBody: issue.body,
			repoUrl: ticket.githubRepo
				? `https://github.com/${ticket.githubRepo}`
				: undefined,
			instructions,
		});
		agentId = agent.id;
	} catch (error) {
		await updateTicket(ticket.$id, { status: "FAILED" });
		await appendTicketEvent({
			ticketId: ticket.$id,
			eventType: "FAILED",
			actor: "ai-agent",
			metadata: {
				error: error instanceof Error ? error.message : "Agent launch failed",
			},
		});
		// Re-throw so the API returns the real error instead of a silent FAILED badge
		throw error instanceof Error
			? error
			: new Error("Agent launch failed");
	}

	const updated = await updateTicket(ticket.$id, {
		status: "IN_PROGRESS",
		cursorAgentRunId: agentId,
	});

	await appendTicketEvent({
		ticketId: ticket.$id,
		eventType: "AGENT_STARTED",
		actor: "ai-agent",
		metadata: { cursorAgentRunId: agentId },
	});

	return updated;
}

export async function syncCursorAgentTicket(ticket: Ticket): Promise<Ticket> {
	if (!ticket.cursorAgentRunId) return ticket;

	const status = await getCursorAgentStatus(ticket.cursorAgentRunId);
	const finished = ["FINISHED", "COMPLETED", "ERROR", "FAILED", "EXPIRED"].includes(
		status.status.toUpperCase(),
	);
	if (!finished) return ticket;

	if (["ERROR", "FAILED", "EXPIRED"].includes(status.status.toUpperCase())) {
		const failed = await updateTicket(ticket.$id, { status: "NEEDS_HUMAN" });
		await appendTicketEvent({
			ticketId: ticket.$id,
			eventType: "NEEDS_HUMAN",
			actor: "ai-agent",
			metadata: { cursorStatus: status.status },
		});
		return failed;
	}

	if (!status.prUrl) {
		const failed = await updateTicket(ticket.$id, { status: "NEEDS_HUMAN" });
		await appendTicketEvent({
			ticketId: ticket.$id,
			eventType: "NEEDS_HUMAN",
			actor: "ai-agent",
			metadata: { reason: "Agent finished without a PR URL" },
		});
		return failed;
	}

	const updated = await updateTicket(ticket.$id, {
		status: "PR_OPEN",
		prUrl: status.prUrl,
		prNumber: parsePrNumberFromUrl(status.prUrl),
	});
	await appendTicketEvent({
		ticketId: ticket.$id,
		eventType: "PR_OPENED",
		actor: "ai-agent",
		metadata: { prUrl: status.prUrl },
	});
	await notifyTicketStaff({ ticket: updated, kind: "pr_opened" });
	return updated;
}

export async function pollInProgressAgents(orgId: string): Promise<number> {
	const { items } = await listTickets({
		orgId,
		status: "IN_PROGRESS",
		limit: 50,
	});
	let updated = 0;
	for (const ticket of items) {
		if (!ticket.cursorAgentRunId) continue;
		await syncCursorAgentTicket(ticket);
		updated += 1;
	}
	return updated;
}
