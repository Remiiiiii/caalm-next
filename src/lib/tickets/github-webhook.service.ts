import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { appendTicketEvent } from "./ticket-events.repository";
import { listPullsForCommit } from "./github-tickets.service";
import {
	getTicketByGithubIssue,
	getTicketByPrNumber,
	updateTicket,
} from "./ticket.repository";
import { getTicketsRepo, type Ticket, type TicketEventType } from "./ticket.types";

export type GitHubWebhookEvent = {
	action?: string;
	issue?: { number: number; html_url?: string };
	assignee?: { login: string };
	pull_request?: {
		number: number;
		html_url: string;
		merged: boolean;
		body?: string | null;
		title?: string;
	};
	repository?: { full_name: string };
	check_suite?: { conclusion: string | null; status: string };
	workflow_run?: {
		conclusion: string | null;
		status: string;
		event?: string;
		head_branch?: string;
		pull_requests?: Array<{ number: number }>;
	};
	/** Commit status payload (Vercel posts `Vercel – caalm-next`). */
	state?: string;
	sha?: string;
	context?: string;
};

function deliveriesTable(): string {
	return appwriteConfig.webhookDeliveriesCollectionId || "webhook_deliveries";
}

export async function claimGitHubDelivery(deliveryId: string): Promise<boolean> {
	const { tablesDB } = await createAdminClient();
	try {
		await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: deliveriesTable(),
			rowId: ID.unique(),
			data: {
				deliveryId,
				source: "github",
				processedAt: new Date().toISOString(),
			},
		});
		return true;
	} catch (error) {
		const existing = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: deliveriesTable(),
			queries: [Query.equal("deliveryId", deliveryId), Query.limit(1)],
		});
		if (existing.total > 0) return false;
		throw error;
	}
}

export type ClassifiedGitHubEvent =
	| {
			kind: "assigned";
			issueNumber: number;
			assigneeLogin: string | null;
	  }
	| { kind: "pr_merged"; issueNumber: number; prNumber: number; prUrl: string }
	| { kind: "ci_passed"; prNumber: number }
	| { kind: "vercel_deployed"; sha: string; context: string }
	| { kind: "ignored" };

/** Hobby-safe deploy doorbell: Vercel GitHub statuses, not a 5-minute cron. */
export function isCaalmNextVercelSuccess(payload: {
	state?: string;
	context?: string;
}): boolean {
	if (payload.state !== "success" || !payload.context) return false;
	return /^Vercel\s[-–]\scaalm-next$/i.test(payload.context.trim());
}

export function classifyGitHubWebhook(
	eventName: string,
	payload: GitHubWebhookEvent,
): ClassifiedGitHubEvent {
	if (eventName === "issues" && payload.action === "assigned") {
		const number = payload.issue?.number;
		if (!number) return { kind: "ignored" };
		return {
			kind: "assigned",
			issueNumber: number,
			assigneeLogin: payload.assignee?.login || null,
		};
	}

	if (
		eventName === "pull_request" &&
		payload.action === "closed" &&
		payload.pull_request?.merged
	) {
		const issueNumber = issueNumberFromPr(payload);
		if (!issueNumber) return { kind: "ignored" };
		return {
			kind: "pr_merged",
			issueNumber,
			prNumber: payload.pull_request.number,
			prUrl: payload.pull_request.html_url,
		};
	}

	const ciSuccess =
		(eventName === "check_suite" &&
			payload.check_suite?.status === "completed" &&
			payload.check_suite.conclusion === "success") ||
		(eventName === "workflow_run" &&
			payload.workflow_run?.status === "completed" &&
			payload.workflow_run.conclusion === "success");

	if (ciSuccess) {
		const prNumber = payload.workflow_run?.pull_requests?.[0]?.number;
		if (!prNumber) return { kind: "ignored" };
		return { kind: "ci_passed", prNumber };
	}

	if (
		eventName === "status" &&
		isCaalmNextVercelSuccess(payload) &&
		payload.sha
	) {
		return {
			kind: "vercel_deployed",
			sha: payload.sha,
			context: payload.context || "Vercel – caalm-next",
		};
	}

	return { kind: "ignored" };
}

function issueNumberFromPr(event: GitHubWebhookEvent): number | null {
	const body = event.pull_request?.body || "";
	const title = event.pull_request?.title || "";
	const match = `${body}\n${title}`.match(/Fixes\s+#(\d+)/i);
	if (match) return Number(match[1]);
	return event.pull_request?.number ?? null;
}

export async function handleGitHubWebhookEvent(
	eventName: string,
	payload: GitHubWebhookEvent,
): Promise<{ handled: boolean; ticketId?: string }> {
	const classified = classifyGitHubWebhook(eventName, payload);
	const repo = payload.repository?.full_name || getTicketsRepo();

	if (classified.kind === "assigned") {
		const ticket = await getTicketByGithubIssue(classified.issueNumber, repo);
		if (!ticket) return { handled: false };
		const updated = await updateTicket(ticket.$id, {
			status: "ASSIGNED",
			assigneeGithubLogin: classified.assigneeLogin,
		});
		await appendTicketEvent({
			ticketId: updated.$id,
			eventType: "ASSIGNED",
			actor: "system",
			metadata: { assigneeGithubLogin: classified.assigneeLogin },
		});
		return { handled: true, ticketId: updated.$id };
	}

	if (classified.kind === "pr_merged") {
		const ticket = await getTicketByGithubIssue(classified.issueNumber, repo);
		if (!ticket) return { handled: false };
		if (ticket.status === "RESOLVED") {
			return { handled: true, ticketId: ticket.$id };
		}
		const updated = await updateTicket(ticket.$id, {
			status: "IN_REVIEW",
			prNumber: classified.prNumber,
			prUrl: classified.prUrl,
		});
		await appendTicketEvent({
			ticketId: updated.$id,
			eventType: "PR_MERGED",
			actor: "system",
			metadata: { prNumber: classified.prNumber },
		});
		return { handled: true, ticketId: updated.$id };
	}

	if (classified.kind === "ci_passed") {
		const ticket = await getTicketByPrNumber(classified.prNumber);
		if (!ticket) return { handled: false };
		return markTicketResolved(ticket, "CI_PASSED");
	}

	if (classified.kind === "vercel_deployed") {
		try {
			const pulls = await listPullsForCommit(classified.sha, repo);
			for (const pull of pulls) {
				if (!pull.mergedAt) continue;
				const issueNumber = issueNumberFromPr({
					pull_request: {
						number: pull.number,
						html_url: "",
						merged: true,
						body: pull.body,
						title: pull.title,
					},
				});
				const ticket =
					(await getTicketByPrNumber(pull.number)) ||
					(issueNumber
						? await getTicketByGithubIssue(issueNumber, repo)
						: null);
				if (!ticket) continue;
				return markTicketResolved(ticket, "DEPLOYED", {
					sha: classified.sha,
					context: classified.context,
					prNumber: pull.number,
				});
			}
		} catch {
			return { handled: false };
		}
		return { handled: false };
	}

	return { handled: false };
}

async function markTicketResolved(
	ticket: Ticket,
	eventType: Extract<TicketEventType, "CI_PASSED" | "DEPLOYED">,
	metadata?: Record<string, unknown>,
): Promise<{ handled: boolean; ticketId: string }> {
	if (ticket.status === "RESOLVED") {
		return { handled: true, ticketId: ticket.$id };
	}

	const updated = await updateTicket(ticket.$id, {
		status: "RESOLVED",
		resolvedAt: new Date().toISOString(),
	});
	await appendTicketEvent({
		ticketId: updated.$id,
		eventType,
		actor: "system",
		metadata,
	});
	await appendTicketEvent({
		ticketId: updated.$id,
		eventType: "ARCHIVED",
		actor: "system",
	});
	return { handled: true, ticketId: updated.$id };
}
