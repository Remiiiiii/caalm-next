import { PERMISSIONS } from "@/constants/permissions";
import type { Ticket } from "./ticket.types";

export type TicketAccessContext = {
	userId: string;
	permissions: string[];
};

export function canViewAllTickets(permissions: string[]): boolean {
	return (
		permissions.includes(PERMISSIONS.TICKETS.ASSIGN) ||
		permissions.includes(PERMISSIONS.PLATFORM.ELEVATE) ||
		permissions.includes(PERMISSIONS.PLATFORM.VIEW_ALL_ORGS)
	);
}

export function canViewTicket(
	ticket: Ticket,
	ctx: TicketAccessContext,
): boolean {
	if (!ctx.permissions.includes(PERMISSIONS.TICKETS.VIEW)) {
		return false;
	}
	if (canViewAllTickets(ctx.permissions)) {
		return true;
	}
	if (ticket.submittedByUserId === ctx.userId) {
		return true;
	}
	if (ticket.assigneeCaalmUserId === ctx.userId) {
		return true;
	}
	return false;
}

export function canResolveTicket(
	ticket: Ticket,
	ctx: TicketAccessContext,
): boolean {
	if (ctx.permissions.includes(PERMISSIONS.PLATFORM.ELEVATE)) {
		return true;
	}
	if (!ctx.permissions.includes(PERMISSIONS.TICKETS.RESOLVE)) {
		return false;
	}
	return ticket.assigneeCaalmUserId === ctx.userId;
}

export function filterVisibleTickets(
	tickets: Ticket[],
	ctx: TicketAccessContext,
): Ticket[] {
	return tickets.filter((ticket) => canViewTicket(ticket, ctx));
}
