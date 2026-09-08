import { appendTicketEvent } from "./ticket-events.repository";
import { canCloseTicket } from "./ticket-access.policy";
import {
	notifyTicketStaff,
	notifyTicketSubmitter,
} from "./ticket-notification.service";
import { getTicketById, updateTicket } from "./ticket.repository";
import { resolveTicketLane, type Ticket } from "./ticket.types";

/**
 * Human "Mark resolved" — Help lane close without Cursor agent.
 */
export async function closeTicket(input: {
	ticketId: string;
	actorId: string;
	permissions: string[];
	note?: string;
}): Promise<Ticket> {
	const ticket = await getTicketById(input.ticketId);
	if (!ticket) {
		throw new Error("Ticket not found");
	}
	if (
		!canCloseTicket(ticket, {
			userId: input.actorId,
			permissions: input.permissions,
		})
	) {
		throw new Error("Not allowed to close this ticket");
	}
	if (ticket.status === "RESOLVED") {
		return ticket;
	}

	const lane = resolveTicketLane(ticket);
	if (lane === "engineering" && ticket.cursorAgentRunId) {
		throw new Error(
			"This ticket has an active fix agent. Wait for it to finish or use Needs human.",
		);
	}

	const updated = await updateTicket(ticket.$id, {
		status: "RESOLVED",
		resolvedAt: new Date().toISOString(),
	});

	await appendTicketEvent({
		ticketId: updated.$id,
		eventType: "MARKED_RESOLVED",
		actor: input.actorId,
		metadata: {
			lane,
			...(input.note?.trim() ? { note: input.note.trim() } : {}),
		},
	});
	await appendTicketEvent({
		ticketId: updated.$id,
		eventType: "ARCHIVED",
		actor: input.actorId,
	});

	try {
		await notifyTicketSubmitter({ ticket: updated });
	} catch (error) {
		console.warn("[tickets] notify submitter on close failed", error);
	}
	try {
		await notifyTicketStaff({ ticket: updated, kind: "issue_created" });
	} catch (error) {
		console.warn("[tickets] notify staff on close failed", error);
	}

	return updated;
}
