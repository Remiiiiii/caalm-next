import { InputFile } from "node-appwrite/file";
import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { appendTicketEvent } from "./ticket-events.repository";
import { notifyTicketStaff } from "./ticket-notification.service";
import { createTicketRow, updateTicket } from "./ticket.repository";
import {
	buildGitHubIssueBody,
	createGitHubIssue,
} from "./github-tickets.service";
import type { CreateTicketInput, Ticket, TicketSeverity } from "./ticket.types";
import { getTicketsRepo, isTicketsEnabled } from "./ticket.types";

export type IntakeActor = {
	$id: string;
	fullName?: string;
	name?: string;
	division?: string;
	orgId?: string;
};

export async function uploadTicketAttachments(
	files: File[],
): Promise<string[]> {
	if (files.length === 0) return [];
	const { storage } = await createAdminClient();
	const bucketId =
		appwriteConfig.ticketAttachmentsBucketId || "ticket_attachments";
	const ids: string[] = [];

	for (const file of files.slice(0, 5)) {
		const buffer = Buffer.from(await file.arrayBuffer());
		const uploaded = await storage.createFile({
			bucketId,
			fileId: ID.unique(),
			file: InputFile.fromBuffer(buffer, file.name),
		});
		ids.push(uploaded.$id);
	}

	return ids;
}

export async function intakeTicket(input: {
	payload: CreateTicketInput;
	actor: IntakeActor;
	orgId: string;
}): Promise<Ticket> {
	const submittedAt = new Date().toISOString();
	const department = input.actor.division?.trim() || "Unassigned";
	const submittedByName =
		input.actor.fullName?.trim() ||
		input.actor.name?.trim() ||
		"CAALM user";

	const ticket = await createTicketRow({
		title: input.payload.title.trim(),
		description: input.payload.description.trim(),
		submittedByUserId: input.actor.$id,
		submittedByName,
		department,
		submittedAt,
		severity: input.payload.severity,
		status: "OPEN",
		attachments: input.payload.attachmentIds || [],
		orgId: input.orgId,
		githubRepo: getTicketsRepo(),
	});

	await appendTicketEvent({
		ticketId: ticket.$id,
		eventType: "CREATED",
		actor: input.actor.$id,
		metadata: { severity: input.payload.severity, department },
	});

	if (!isTicketsEnabled()) {
		return ticket;
	}

	const issue = await createGitHubIssue({
		title: ticket.title,
		body: buildGitHubIssueBody({
			name: submittedByName,
			userId: input.actor.$id,
			department,
			submittedAt,
			severity: ticket.severity,
			description: ticket.description,
			ticketId: ticket.$id,
		}),
		labels: [
			"source:caalm-ticket",
			`dept:${slugLabel(department)}`,
			`severity:${ticket.severity}`,
		],
	});

	const updated = await updateTicket(ticket.$id, {
		githubIssueNumber: issue.number,
		githubIssueUrl: issue.htmlUrl,
		githubRepo: issue.repo,
	});

	await appendTicketEvent({
		ticketId: ticket.$id,
		eventType: "ISSUE_CREATED",
		actor: "ai-agent",
		metadata: { githubIssueNumber: issue.number, githubIssueUrl: issue.htmlUrl },
	});

	await notifyTicketStaff({ ticket: updated, kind: "issue_created" });
	return updated;
}

export function slugLabel(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 50) || "unassigned";
}

export function parseSeverity(value: unknown): TicketSeverity {
	if (value === "low" || value === "medium" || value === "high" || value === "critical") {
		return value;
	}
	throw new Error("Invalid severity");
}
