import { getTicketById, updateTicket } from "./ticket.repository";
import type { Ticket } from "./ticket.types";
import { canAssignTicket } from "./ticket-access.policy";
import { appendTicketEvent } from "./ticket-events.repository";
import { listItStaff } from "./ticket-staff";

/** Hand a ticket to an IT staff member (or reassign it). */
export async function assignTicket(input: {
	ticketId: string;
	assigneeId: string;
	actorId: string;
	permissions: string[];
}): Promise<Ticket> {
	const ticket = await getTicketById(input.ticketId);
	if (!ticket) {
		throw new Error("Ticket not found");
	}
	if (
		!canAssignTicket(ticket, {
			userId: input.actorId,
			permissions: input.permissions,
		})
	) {
		throw new Error("Not allowed to assign this ticket");
	}
	if (ticket.assigneeCaalmUserId === input.assigneeId) {
		return ticket;
	}

	const staff = await listItStaff();
	if (!staff.some((member) => member.$id === input.assigneeId)) {
		throw new Error("Assignee must be an active IT staff member");
	}

	const updated = await updateTicket(ticket.$id, {
		assigneeCaalmUserId: input.assigneeId,
		status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status,
	});

	await appendTicketEvent({
		ticketId: updated.$id,
		eventType: "ASSIGNED",
		actor: input.actorId,
		metadata: {
			assigneeCaalmUserId: input.assigneeId,
			previousAssigneeCaalmUserId: ticket.assigneeCaalmUserId ?? null,
		},
	});

	return updated;
}
