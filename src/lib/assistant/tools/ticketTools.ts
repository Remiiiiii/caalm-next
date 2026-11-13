import { PERMISSIONS } from "@/constants/permissions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { logAuditEvent } from "@/lib/services/audit-logger";
import {
	assertProblemPageUrl,
	defaultProblemPageUrl,
} from "@/lib/tickets/problem-page-url";
import {
	getTicketById,
	getTicketByNumber,
	listTickets,
} from "@/lib/tickets/ticket.repository";
import type { Ticket, TicketSeverity } from "@/lib/tickets/ticket.types";
import { assignTicket } from "@/lib/tickets/ticket-assign.service";
import {
	HELP_TICKET_CATEGORIES,
	TICKET_IMPACT_LEVELS,
	TICKET_URGENCY_LEVELS,
} from "@/lib/tickets/ticket-intake.constants";
import {
	type IntakeActor,
	intakeTicket,
} from "@/lib/tickets/ticket-intake.service";
import { listItStaff } from "@/lib/tickets/ticket-staff";

function actorName(ctx: {
	user: { fullName?: string; name?: string | null; email?: string | null };
}): string {
	return (
		(ctx.user as { fullName?: string }).fullName ||
		ctx.user.name ||
		ctx.user.email ||
		"User"
	);
}

function summarizeTicket(ticket: Ticket) {
	return {
		id: ticket.$id,
		ticketNumber: ticket.ticketNumber,
		title: ticket.title,
		status: ticket.status,
		severity: ticket.severity,
		assigneeCaalmUserId: ticket.assigneeCaalmUserId ?? null,
		submittedByName: ticket.submittedByName,
		submittedAt: ticket.submittedAt,
	};
}

async function resolveTicket(
	orgId: string,
	args: { ticketId?: unknown; ticketNumber?: unknown },
): Promise<{ ticket?: Ticket; error?: string }> {
	const ticketId = String(args.ticketId ?? "").trim();
	const ticketNumber = String(args.ticketNumber ?? "").trim();
	if (ticketId) {
		const ticket = await getTicketById(ticketId);
		if (!ticket || ticket.orgId !== orgId) {
			return { error: `I couldn't find a ticket with id "${ticketId}".` };
		}
		return { ticket };
	}
	if (ticketNumber) {
		const ticket = await getTicketByNumber({ orgId, ticketNumber });
		if (!ticket) {
			return {
				error: `I couldn't find a ticket numbered "${ticketNumber}".`,
			};
		}
		return { ticket };
	}
	return { error: "Give the ticketId or ticketNumber." };
}

export const TICKET_TOOLS: ToolDefinition[] = [
	{
		name: "create_ticket",
		description:
			"Create, get, or list IT help tickets. Default action is create (requires user confirmation before execution); use action 'list' or 'get' to look tickets up (read-only, no confirmation needed). Tickets created here always use the help lane (no GitHub issue is opened).",
		requiredPermissions: [],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				action: {
					type: "string",
					enum: ["create", "list", "get"],
					description: "Defaults to create",
				},
				title: { type: "string" },
				description: { type: "string" },
				category: {
					type: "string",
					enum: HELP_TICKET_CATEGORIES as unknown as string[],
				},
				impact: {
					type: "string",
					enum: TICKET_IMPACT_LEVELS.map((l) => l.value),
					description:
						"How widely this affects people: low/medium/high/critical",
				},
				urgency: {
					type: "string",
					enum: TICKET_URGENCY_LEVELS.map((l) => l.value),
					description:
						"How soon this needs attention: low/medium/high/critical",
				},
				problemPageUrl: {
					type: "string",
					description:
						"The in-app page where the problem happens; defaults to the current page",
				},
				ticketId: { type: "string" },
				ticketNumber: { type: "string" },
				status: {
					type: "string",
					description:
						"For list: OPEN/ASSIGNED/IN_PROGRESS/... or 'active'/'resolved'",
				},
				search: { type: "string" },
				limit: { type: "number" },
			},
		},
		handler: async (ctx, args) => {
			const action = String(args.action ?? "create");

			if (action === "list") {
				if (!hasAll(ctx, [PERMISSIONS.TICKETS.VIEW])) {
					return { result: { error: "Missing tickets.view permission" } };
				}
				const limit = Math.min(Number(args.limit) || 15, 50);
				const { items, total } = await listTickets({
					orgId: ctx.orgId,
					status: args.status as Parameters<typeof listTickets>[0]["status"],
					search: args.search ? String(args.search) : undefined,
					limit,
				});
				return {
					result: { tickets: items.map(summarizeTicket), total },
				};
			}

			if (action === "get") {
				if (!hasAll(ctx, [PERMISSIONS.TICKETS.VIEW])) {
					return { result: { error: "Missing tickets.view permission" } };
				}
				const { ticket, error } = await resolveTicket(ctx.orgId, args);
				if (error) return { result: { error } };
				return { result: { ticket: summarizeTicket(ticket as Ticket) } };
			}

			if (!hasAll(ctx, [PERMISSIONS.TICKETS.CREATE])) {
				return { result: { error: "Missing tickets.create permission" } };
			}
			const title = String(args.title ?? "").trim();
			const description = String(args.description ?? "").trim();
			const category = String(args.category ?? "").trim();
			if (!title || !description) {
				return {
					result: { error: "Give a title and description for the ticket." },
				};
			}
			if (!HELP_TICKET_CATEGORIES.includes(category as never)) {
				return {
					result: {
						error: `category must be one of: ${HELP_TICKET_CATEGORIES.join(", ")}`,
					},
				};
			}
			const impact = String(args.impact ?? "medium") as TicketSeverity;
			const urgency = String(args.urgency ?? "medium") as TicketSeverity;
			if (!TICKET_IMPACT_LEVELS.some((l) => l.value === impact)) {
				return {
					result: { error: "impact must be low, medium, high, or critical" },
				};
			}
			if (!TICKET_URGENCY_LEVELS.some((l) => l.value === urgency)) {
				return {
					result: { error: "urgency must be low, medium, high, or critical" },
				};
			}

			let problemPageUrl: string;
			try {
				problemPageUrl = assertProblemPageUrl(
					args.problemPageUrl ??
						defaultProblemPageUrl(ctx.pathname ?? "/dashboard", ""),
					"",
				);
			} catch (error) {
				return { result: { error: (error as Error).message } };
			}

			const actor: IntakeActor = {
				$id: ctx.user.$id,
				fullName: actorName(ctx),
				orgId: ctx.orgId,
			};
			const ticket = await intakeTicket({
				payload: {
					title,
					description,
					lane: "help",
					category,
					problemPageUrl,
					impact,
					urgency,
					severity: impact,
				},
				actor,
				orgId: ctx.orgId,
			});

			await logAuditEvent({
				event_id: `assistant_ticket_${ticket.$id}`,
				event_title: `Assistant created ticket: ${ticket.ticketNumber || ticket.title}`,
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx),
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "ticket",
				target_id: ticket.$id,
				target_label: ticket.title,
				summary: `CAALM assistant opened ticket ${ticket.ticketNumber || ticket.title}`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);

			return {
				result: {
					ticketId: ticket.$id,
					ticketNumber: ticket.ticketNumber,
					title: ticket.title,
					status: ticket.status,
				},
			};
		},
	},
	{
		name: "assign_ticket",
		description:
			"Assign or reassign a ticket to an IT staff member (requires user confirmation before execution). Find the ticket by ticketId or ticketNumber, and the assignee by assigneeId or assigneeName.",
		requiredPermissions: [PERMISSIONS.TICKETS.ASSIGN],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				ticketId: { type: "string" },
				ticketNumber: { type: "string" },
				assigneeId: { type: "string" },
				assigneeName: {
					type: "string",
					description: "IT staff member's name, when assigneeId is not known",
				},
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.TICKETS.ASSIGN])) {
				return { result: { error: "Missing tickets.assign permission" } };
			}
			const { ticket, error } = await resolveTicket(ctx.orgId, args);
			if (error || !ticket) return { result: { error } };

			let assigneeId = String(args.assigneeId ?? "").trim();
			const assigneeName = String(args.assigneeName ?? "").trim();
			if (!assigneeId && assigneeName) {
				const staff = await listItStaff();
				const matches = staff.filter((member) =>
					member.fullName.toLowerCase().includes(assigneeName.toLowerCase()),
				);
				if (matches.length === 0) {
					return {
						result: {
							error: `I couldn't find an IT staff member matching "${assigneeName}".`,
						},
					};
				}
				if (matches.length > 1) {
					return {
						result: {
							error: `I found ${matches.length} staff matching "${assigneeName}": ${matches
								.slice(0, 3)
								.map((m) => m.fullName)
								.join(", ")}. Tell me which one.`,
						},
					};
				}
				assigneeId = matches[0].$id;
			}
			if (!assigneeId) {
				return { result: { error: "Give the assigneeId or assigneeName." } };
			}

			let updated: Ticket;
			try {
				updated = await assignTicket({
					ticketId: ticket.$id,
					assigneeId,
					actorId: ctx.user.$id,
					permissions: ctx.permissions,
				});
			} catch (error) {
				return { result: { error: (error as Error).message } };
			}

			await logAuditEvent({
				event_id: `assistant_ticket_assign_${updated.$id}_${Date.now()}`,
				event_title: `Assistant assigned ticket: ${updated.ticketNumber || updated.title}`,
				action: "update",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx),
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "ticket",
				target_id: updated.$id,
				target_label: updated.title,
				summary: `CAALM assistant assigned ticket ${updated.ticketNumber || updated.title}`,
				metadata: { source: "ai_assistant", assigneeId },
			}).catch(() => undefined);

			return {
				result: {
					ticketId: updated.$id,
					ticketNumber: updated.ticketNumber,
					status: updated.status,
					assigneeCaalmUserId: updated.assigneeCaalmUserId,
				},
			};
		},
	},
];
