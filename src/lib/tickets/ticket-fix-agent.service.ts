import { cancelCursorRun, sendCursorFollowUp } from "./cursor-agent.service";
import { getTicketById, updateTicket } from "./ticket.repository";
import { resolveTicketLane, type Ticket } from "./ticket.types";
import { canStartFixAgent } from "./ticket-access.policy";
import { appendTicketEvent } from "./ticket-events.repository";

type Actor = { ticketId: string; actorId: string; permissions: string[] };

/** Loads a ticket the actor may direct and that has a Cursor agent. */
async function loadAgentTicket(
	input: Actor,
): Promise<{ ticket: Ticket; agentId: string }> {
	const ticket = await getTicketById(input.ticketId);
	if (!ticket) throw new Error("Ticket not found");
	if (
		!canStartFixAgent(ticket, {
			userId: input.actorId,
			permissions: input.permissions,
		})
	) {
		throw new Error("Not allowed to direct the fix agent for this ticket");
	}
	if (resolveTicketLane(ticket) !== "engineering") {
		throw new Error("Fix agent is only for Engineering tickets");
	}
	if (!ticket.cursorAgentRunId) {
		throw new Error("No fix agent is running for this ticket");
	}
	return { ticket, agentId: ticket.cursorAgentRunId };
}

/** Cancels the agent's active run and hands the ticket back to a human. */
export async function stopFixAgent(input: Actor): Promise<Ticket> {
	const { ticket, agentId } = await loadAgentTicket(input);
	await cancelCursorRun(agentId);

	const updated = await updateTicket(ticket.$id, { status: "NEEDS_HUMAN" });
	// The events table has no AGENT_STOPPED type, so the stop is logged as a hand-off.
	await appendTicketEvent({
		ticketId: ticket.$id,
		eventType: "NEEDS_HUMAN",
		actor: input.actorId,
		metadata: { reason: "Fix agent stopped", cursorAgentRunId: agentId },
	});
	return updated;
}

/** Sends the operator's guidance to the running agent. */
export async function messageFixAgent(
	input: Actor & { text: string },
): Promise<void> {
	const text = input.text.trim();
	if (!text) throw new Error("Message is empty");
	if (text.length > 4000) throw new Error("Message is too long");
	const { agentId } = await loadAgentTicket(input);
	await sendCursorFollowUp(agentId, text);
}
