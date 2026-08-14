import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { isITDepartment } from "@/lib/rbac/it-department";
import { getUserPermissions } from "@/lib/rbac/permissions";
import {
	NotificationService,
	notificationService,
} from "@/lib/services/notificationService";
import { getUsersByRoleNames } from "@/lib/utils/get-users-by-role";
import type { Ticket } from "./ticket.types";

type StaffRecipient = {
	userId: string;
	email: string;
	name: string;
};

const TICKET_NOTIFICATION_TYPES = [
	{
		type_key: "ticket-created",
		label: "Ticket Created",
		icon: "ticket",
		color_classes: "text-blue-600",
		bg_color_classes: "bg-blue-50",
		priority: "medium" as const,
		enabled: true,
		description: "In-app alert when a new support ticket is submitted",
	},
	{
		type_key: "ticket-pr-opened",
		label: "Ticket PR Opened",
		icon: "git-pull-request",
		color_classes: "text-purple-600",
		bg_color_classes: "bg-purple-50",
		priority: "medium" as const,
		enabled: true,
		description: "In-app alert when a ticket pull request is ready for review",
	},
] as const;

let ticketTypesEnsured: Promise<void> | null = null;

/** Create ticket notification type rows once if they are missing from Appwrite. */
export async function ensureTicketNotificationTypes(): Promise<void> {
	if (!ticketTypesEnsured) {
		ticketTypesEnsured = (async () => {
			const service = new NotificationService();
			for (const type of TICKET_NOTIFICATION_TYPES) {
				try {
					const existing = await service.getNotificationType(type.type_key);
					if (!existing) {
						await service.createNotificationType({ ...type });
					}
				} catch (error) {
					console.warn(
						`[tickets] failed to ensure notification type ${type.type_key}`,
						error,
					);
				}
			}
		})();
	}
	await ticketTypesEnsured;
}

async function listOrgUserIds(orgId: string): Promise<string[]> {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "user_organizations",
		queries: [Query.equal("orgId", orgId), Query.limit(500)],
	});
	return result.rows
		.map((row) => (row as { userId?: string }).userId)
		.filter((id): id is string => Boolean(id));
}

async function resolveUserProfile(userId: string): Promise<{
	$id: string;
	email?: string;
	fullName?: string;
	department?: string;
	departmentLabel?: string;
} | null> {
	const { tablesDB } = await createAdminClient();
	const databaseId = appwriteConfig.databaseId || "default-db";
	const tableId = appwriteConfig.usersCollectionId || "users";

	try {
		const user = await tablesDB.getRow({
			databaseId,
			tableId,
			rowId: userId,
		});
		return user as {
			$id: string;
			email?: string;
			fullName?: string;
			department?: string;
			departmentLabel?: string;
		};
	} catch {
		// user_organizations / user_roles often store Auth accountId
	}

	const byAccount = await tablesDB.listRows({
		databaseId,
		tableId,
		queries: [Query.equal("accountId", userId), Query.limit(1)],
	});
	const row = byAccount.rows[0];
	return row
		? (row as {
				$id: string;
				email?: string;
				fullName?: string;
				department?: string;
				departmentLabel?: string;
			})
		: null;
}

function toRecipient(user: {
	$id: string;
	email?: string;
	fullName?: string;
}): StaffRecipient {
	return {
		userId: user.$id,
		email: String(user.email || ""),
		name: String(user.fullName || user.email || "CAALM user"),
	};
}

/**
 * Who should get ticket alerts:
 * 1) Users with ticket-assign / platform elevate (IT staff + elevated ops)
 * 2) Department Managers whose department is IT
 *
 * Why both: tickets are IT work. DMs only have TICKETS.VIEW/CREATE in the seed,
 * so ASSIGN-only targeting silently skipped the IT department manager.
 */
export async function listTicketStaffRecipients(
	orgId: string,
): Promise<StaffRecipient[]> {
	const byDocId = new Map<string, StaffRecipient>();

	const userIds = await listOrgUserIds(orgId);
	for (const userId of userIds) {
		try {
			const permissions = await getUserPermissions(userId, orgId);
			const isStaff =
				permissions.includes(PERMISSIONS.TICKETS.ASSIGN) ||
				permissions.includes(PERMISSIONS.PLATFORM.ELEVATE);
			if (!isStaff) continue;

			const user = await resolveUserProfile(userId);
			if (!user?.$id) continue;
			byDocId.set(user.$id, toRecipient(user));
		} catch (error) {
			console.warn("[tickets] staff recipient lookup failed", userId, error);
		}
	}

	try {
		// Do not filter status=active — many profiles have null status.
		const managers = await getUsersByRoleNames(
			["Department Manager", "manager"],
			orgId,
		);
		for (const manager of managers) {
			if (
				!isITDepartment({
					department: manager.department,
					departmentLabel: manager.departmentLabel,
				})
			) {
				continue;
			}
			const docId = String(manager.$id || "").trim();
			if (!docId || byDocId.has(docId)) continue;
			byDocId.set(docId, toRecipient(manager));
		}
	} catch (error) {
		console.warn("[tickets] IT department manager lookup failed", error);
	}

	return [...byDocId.values()];
}

export async function notifyTicketStaff(input: {
	ticket: Ticket;
	kind: "issue_created" | "pr_opened";
}): Promise<void> {
	await ensureTicketNotificationTypes();

	const recipients = await listTicketStaffRecipients(input.ticket.orgId);
	if (recipients.length === 0) {
		console.warn(
			`[tickets] no staff recipients for org ${input.ticket.orgId} (ticket ${input.ticket.$id})`,
		);
		return;
	}

	const isIssue = input.kind === "issue_created";
	const title = isIssue
		? `New ticket: ${input.ticket.title}`
		: `PR ready for review: ${input.ticket.title}`;
	const githubUrl = isIssue
		? input.ticket.githubIssueUrl
		: input.ticket.prUrl;
	// Ticket detail page works for staff + IT DMs (IT portal may redirect non-IT dept).
	const caalmUrl = `/tickets/${input.ticket.$id}`;
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
