import { InputFile } from "node-appwrite/file";
import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { appendTicketEvent } from "./ticket-events.repository";
import {
	TICKET_CATEGORIES,
	TICKET_MODULES,
	deriveSeverityFromMatrix,
	type TicketImpactUrgency,
} from "./ticket-intake.constants";
import {
	notifyTicketStaff,
	notifyTicketSubmitter,
} from "./ticket-notification.service";
import { resolveSubmitterDepartmentLabel } from "./submitter-placement";
import { allocateTicketNumber } from "./ticket-number.service";
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
	department?: string;
	departmentLabel?: string;
	divisionLabel?: string;
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
	const department = resolveSubmitterDepartmentLabel(input.actor);
	const submittedByName =
		input.actor.fullName?.trim() ||
		input.actor.name?.trim() ||
		"CAALM user";

	const { severity } = deriveSeverityFromMatrix(
		input.payload.impact,
		input.payload.urgency,
	);

	// Human reference number first so confirm UI / email always have something to show.
	const ticketNumber = await allocateTicketNumber(input.orgId);

	const ticket = await createTicketRow({
		title: input.payload.title.trim(),
		description: input.payload.description.trim(),
		category: input.payload.category,
		affectedModule: input.payload.affectedModule || null,
		impact: input.payload.impact,
		urgency: input.payload.urgency,
		submittedByUserId: input.actor.$id,
		submittedByName,
		department,
		submittedAt,
		severity,
		status: "OPEN",
		attachments: input.payload.attachmentIds || [],
		orgId: input.orgId,
		githubRepo: getTicketsRepo(),
		ticketNumber,
	});

	await appendTicketEvent({
		ticketId: ticket.$id,
		eventType: "CREATED",
		actor: input.actor.$id,
		metadata: {
			severity,
			department,
			category: input.payload.category,
			impact: input.payload.impact,
			urgency: input.payload.urgency,
			ticketNumber,
		},
	});

	// Notify submitter + staff as soon as the ticket exists.
	// Do not wait for GitHub — that path can fail and previously skipped alerts.
	try {
		await notifyTicketSubmitter({ ticket });
	} catch (error) {
		console.warn("[tickets] notify submitter on create failed", error);
	}
	try {
		await notifyTicketStaff({ ticket, kind: "issue_created" });
	} catch (error) {
		console.warn("[tickets] notify on create failed", error);
	}

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
			category: ticket.category,
			affectedModule: ticket.affectedModule,
			impact: ticket.impact,
			urgency: ticket.urgency,
			description: ticket.description,
			ticketId: ticket.$id,
			ticketNumber: ticket.ticketNumber,
		}),
		labels: [
			"source:caalm-ticket",
			`dept:${slugLabel(department)}`,
			`severity:${ticket.severity}`,
			`category:${slugLabel(ticket.category)}`,
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

export function parseImpactUrgency(value: unknown, field: "impact" | "urgency"): TicketImpactUrgency {
	try {
		return parseSeverity(value);
	} catch {
		throw new Error(`Invalid ${field}`);
	}
}

export function parseCategory(value: unknown): string {
	const category = String(value || "").trim();
	if (!TICKET_CATEGORIES.includes(category as (typeof TICKET_CATEGORIES)[number])) {
		throw new Error("Invalid category");
	}
	return category;
}

export function parseAffectedModule(value: unknown): string | null {
	const moduleValue = String(value || "").trim();
	if (!moduleValue) return null;
	if (!TICKET_MODULES.includes(moduleValue as (typeof TICKET_MODULES)[number])) {
		throw new Error("Invalid affected module");
	}
	return moduleValue;
}

export function buildCreateTicketInput(input: {
	title: string;
	description: string;
	category: unknown;
	affectedModule?: unknown;
	impact: unknown;
	urgency: unknown;
	attachmentIds?: string[];
}): CreateTicketInput {
	const impact = parseImpactUrgency(input.impact, "impact");
	const urgency = parseImpactUrgency(input.urgency, "urgency");
	const { severity } = deriveSeverityFromMatrix(impact, urgency);

	return {
		title: input.title.trim(),
		description: input.description.trim(),
		category: parseCategory(input.category),
		affectedModule: parseAffectedModule(input.affectedModule),
		impact,
		urgency,
		severity,
		attachmentIds: input.attachmentIds,
	};
}
