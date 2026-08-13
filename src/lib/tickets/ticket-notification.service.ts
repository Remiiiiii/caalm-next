import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getUserPermissions } from "@/lib/rbac/permissions";
import { notificationService } from "@/lib/services/notificationService";
import type { Ticket } from "./ticket.types";

type StaffRecipient = {
	userId: string;
	email: string;
	name: string;
};

async function listOrgUserIds(orgId: string): Promise<string[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "user_organizations",
		queries: [Query.equal("orgId", orgId), Query.limit(200)],
	});
	return result.rows
		.map((row) => (row as { userId?: string }).userId)
		.filter((id): id is string => Boolean(id));
}

export async function listTicketStaffRecipients(
	orgId: string,
): Promise<StaffRecipient[]> {
	const userIds = await listOrgUserIds(orgId);
	const { tablesDB } = await createAdminClient();
	const recipients: StaffRecipient[] = [];

	for (const userId of userIds) {
		const permissions = await getUserPermissions(userId, orgId);
		const isStaff =
			permissions.includes(PERMISSIONS.TICKETS.ASSIGN) ||
			permissions.includes(PERMISSIONS.PLATFORM.ELEVATE);
		if (!isStaff) continue;

		try {
			const user = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: appwriteConfig.usersCollectionId || "users",
				rowId: userId,
			});
			recipients.push({
				userId,
				email: String((user as { email?: string }).email || ""),
				name: String(
					(user as { fullName?: string }).fullName ||
						(user as { email?: string }).email ||
						"CAALM user",
				),
			});
		} catch {
			// user_organizations may store accountId; skip unresolvable rows
		}
	}

	return recipients;
}

export async function notifyTicketStaff(input: {
	ticket: Ticket;
	kind: "issue_created" | "pr_opened";
}): Promise<void> {
	const recipients = await listTicketStaffRecipients(input.ticket.orgId);
	const isIssue = input.kind === "issue_created";
	const title = isIssue
		? `New ticket: ${input.ticket.title}`
		: `PR ready for review: ${input.ticket.title}`;
	const githubUrl = isIssue
		? input.ticket.githubIssueUrl
		: input.ticket.prUrl;
	const caalmUrl = `/dashboard/it/status/${input.ticket.$id}`;
	const message = isIssue
		? `${input.ticket.submittedByName} submitted a ${input.ticket.severity} ticket from ${input.ticket.department}.`
		: `A pull request is ready for ${input.ticket.title}.`;

	for (const recipient of recipients) {
		try {
			await notificationService.createNotification({
				type: isIssue ? "ticket-created" : "ticket-pr-opened",
				title,
				message,
				userId: recipient.userId,
				priority: input.ticket.severity === "critical" ? "high" : "medium",
				actionUrl: caalmUrl,
				actionText: "Open ticket",
				metadata: {
					ticketId: input.ticket.$id,
					githubUrl,
				},
			});
		} catch (error) {
			console.warn("[tickets] in-app notification failed", error);
		}

		if (recipient.email) {
			try {
				const { mailgunService } = await import("@/lib/services/mailgun");
				await mailgunService.sendEmail({
					to: recipient.email,
					subject: title,
					text: `${message}\n\nCAALM: ${caalmUrl}\nGitHub: ${githubUrl || "n/a"}`,
					html: `<p>${message}</p><p><a href="${caalmUrl}">Open in CAALM</a>${
						githubUrl ? ` · <a href="${githubUrl}">Open on GitHub</a>` : ""
					}</p>`,
				});
			} catch (error) {
				console.warn("[tickets] email notification failed", error);
			}
		}
	}
}
