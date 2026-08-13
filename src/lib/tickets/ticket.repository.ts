import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	ACTIVE_TICKET_STATUSES,
	type Ticket,
	type TicketStatus,
} from "./ticket.types";

function ticketsTable(): string {
	return appwriteConfig.ticketsCollectionId || "tickets";
}

function dbId(): string {
	return appwriteConfig.databaseId || "default-db";
}

export async function createTicketRow(
	data: Omit<Ticket, "$id" | "$createdAt" | "$updatedAt">,
): Promise<Ticket> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: ticketsTable(),
		rowId: ID.unique(),
		data,
	});
	return row as unknown as Ticket;
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: ticketsTable(),
			rowId: ticketId,
		});
		return row as unknown as Ticket;
	} catch {
		return null;
	}
}

export async function getTicketByGithubIssue(
	issueNumber: number,
	repo: string,
): Promise<Ticket | null> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: ticketsTable(),
		queries: [
			Query.equal("githubIssueNumber", issueNumber),
			Query.equal("githubRepo", repo),
			Query.limit(1),
		],
	});
	return (result.rows[0] as unknown as Ticket) ?? null;
}

export async function updateTicket(
	ticketId: string,
	data: Partial<Ticket>,
): Promise<Ticket> {
	const { tablesDB } = await createAdminClient();
	const { $id: _id, $createdAt: _c, $updatedAt: _u, ...patch } = data;
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: ticketsTable(),
		rowId: ticketId,
		data: patch,
	});
	return row as unknown as Ticket;
}

export async function listTickets(options: {
	orgId: string;
	status?: TicketStatus | "active" | "resolved";
	submittedByUserId?: string;
	assigneeCaalmUserId?: string;
	limit?: number;
	offset?: number;
}): Promise<{ items: Ticket[]; total: number }> {
	const { tablesDB } = await createAdminClient();
	const queries = [Query.equal("orgId", options.orgId)];

	if (options.status === "active") {
		queries.push(Query.equal("status", [...ACTIVE_TICKET_STATUSES]));
	} else if (options.status === "resolved") {
		queries.push(Query.equal("status", "RESOLVED"));
	} else if (options.status) {
		queries.push(Query.equal("status", options.status));
	}

	if (options.submittedByUserId) {
		queries.push(Query.equal("submittedByUserId", options.submittedByUserId));
	}
	if (options.assigneeCaalmUserId) {
		queries.push(
			Query.equal("assigneeCaalmUserId", options.assigneeCaalmUserId),
		);
	}

	queries.push(Query.orderDesc("submittedAt"));
	queries.push(Query.limit(options.limit ?? 50));
	queries.push(Query.offset(options.offset ?? 0));

	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: ticketsTable(),
		queries,
	});

	return {
		items: result.rows as unknown as Ticket[],
		total: result.total,
	};
}
