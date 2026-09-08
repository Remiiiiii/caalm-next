import { getTicketById, updateTicket } from "./ticket.repository";
import type { Ticket } from "./ticket.types";
import { canClaimTicket } from "./ticket-access.policy";
import { appendTicketEvent } from "./ticket-events.repository";

export async function claimTicket(input: {
	ticketId: string;
	actorId: string;
	permissions: string[];
}): Promise<Ticket> {
	const ticket = await getTicketById(input.ticketId);
	if (!ticket) {
		throw new Error("Ticket not found");
	}
	if (
		!canClaimTicket(ticket, {
			userId: input.actorId,
			permissions: input.permissions,
		})
	) {
		throw new Error("Not allowed to claim this ticket");
	}
	if (ticket.status === "RESOLVED") {
		throw new Error("Ticket is already resolved");
	}
	if (ticket.assigneeCaalmUserId === input.actorId) {
		return ticket;
	}
	if (
		ticket.assigneeCaalmUserId &&
		ticket.assigneeCaalmUserId !== input.actorId
	) {
		throw new Error("Ticket is already claimed by someone else");
	}

	const updated = await updateTicket(ticket.$id, {
		assigneeCaalmUserId: input.actorId,
		status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status,
	});

	await appendTicketEvent({
		ticketId: updated.$id,
		eventType: "CLAIMED",
		actor: input.actorId,
		metadata: { assigneeCaalmUserId: input.actorId },
	});

	return updated;
}
