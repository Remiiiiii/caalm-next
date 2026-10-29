import { getLatestRun, isCursorRunActive } from "./cursor-agent.service";
import { getTicketById, updateTicket } from "./ticket.repository";
import { resolveTicketLane, type Ticket } from "./ticket.types";
import { canCloseTicket } from "./ticket-access.policy";
import { appendTicketEvent } from "./ticket-events.repository";
import {
	notifyTicketStaff,
	notifyTicketSubmitter,
} from "./ticket-notification.service";

/**
 * True only while the ticket's Cursor run is actually running. A finished or
 * stopped agent still has its id on the ticket and must not block closing.
 * If Cursor can't be reached, trust our own record of the ticket status.
 */
async function isFixAgentWorking(ticket: Ticket): Promise<boolean> {
	try {
		const run = await getLatestRun(ticket.cursorAgentRunId as string);
		return run ? isCursorRunActive(run.status) : false;
	} catch (error) {
		console.warn("[tickets] could not check fix agent status", error);
		return ticket.status === "IN_PROGRESS";
	}
}

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
		if (await isFixAgentWorking(ticket)) {
			throw new Error(
				"The fix agent is still working. Stop it with “Stop agent” in the Fix Agent Workspace, or wait until the workspace says Finished, then mark the ticket resolved.",
			);
		}
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
