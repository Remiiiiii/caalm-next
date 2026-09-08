import { PERMISSIONS } from "@/constants/permissions";
import type { Ticket } from "./ticket.types";
import { resolveTicketLane } from "./ticket.types";

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

function hasElevate(ctx: TicketAccessContext): boolean {
	return ctx.permissions.includes(PERMISSIONS.PLATFORM.ELEVATE);
}

function hasResolve(ctx: TicketAccessContext): boolean {
	return ctx.permissions.includes(PERMISSIONS.TICKETS.RESOLVE);
}

function hasAssign(ctx: TicketAccessContext): boolean {
	return ctx.permissions.includes(PERMISSIONS.TICKETS.ASSIGN);
}

/** Unclaimed tickets: any staff with RESOLVE (or elevate) may claim. */
export function canClaimTicket(
	ticket: Ticket,
	ctx: TicketAccessContext,
): boolean {
	if (hasElevate(ctx)) return true;
	if (!hasResolve(ctx) && !hasAssign(ctx)) return false;
	if (ticket.status === "RESOLVED") return false;
	if (!ticket.assigneeCaalmUserId) return true;
	return ticket.assigneeCaalmUserId === ctx.userId;
}

/** Mark resolved / Start fix agent: assignee or elevate. */
export function canResolveTicket(
	ticket: Ticket,
	ctx: TicketAccessContext,
): boolean {
	if (hasElevate(ctx)) return true;
	if (!hasResolve(ctx)) return false;
	return ticket.assigneeCaalmUserId === ctx.userId;
}

export function canCloseTicket(
	ticket: Ticket,
	ctx: TicketAccessContext,
): boolean {
	if (resolveTicketLane(ticket) === "engineering" && ticket.githubIssueNumber) {
		// Engineering with GitHub still allows human close (e.g. false alarm)
		// for the assignee — agent path is separate.
	}
	return canResolveTicket(ticket, ctx);
}

export function canEscalateTicket(
	ticket: Ticket,
	ctx: TicketAccessContext,
): boolean {
	if (resolveTicketLane(ticket) !== "help") return false;
	if (hasElevate(ctx)) return true;
	if (!hasResolve(ctx) && !hasAssign(ctx)) return false;
	if (!ticket.assigneeCaalmUserId) return true;
	return ticket.assigneeCaalmUserId === ctx.userId;
}

export function canStartFixAgent(
	ticket: Ticket,
	ctx: TicketAccessContext,
): boolean {
	if (resolveTicketLane(ticket) !== "engineering") return false;
	if (!ticket.githubIssueNumber) return false;
	return canResolveTicket(ticket, ctx);
}

export function filterVisibleTickets(
	tickets: Ticket[],
	ctx: TicketAccessContext,
): Ticket[] {
	return tickets.filter((ticket) => canViewTicket(ticket, ctx));
}
