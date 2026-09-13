import { issueApprovalActionToken } from "@/lib/approvals/approvalActionTokens";
import { createAdminClient } from "@/lib/appwrite";
import { flattenTableRow } from "@/lib/appwrite/flatten-row";
import { appwriteConfig } from "@/lib/appwrite/config";
import { isDemoMode } from "@/lib/config/demo-mode";
import { triggerNotification } from "@/lib/utils/notificationTriggers";
import { Query } from "node-appwrite";

function uniqueIds(ids: Array<string | undefined | null>): string[] {
	return [
		...new Set(ids.filter((id): id is string => !!id && id.trim().length > 0)),
	];
}

function appBaseUrl(): string {
	return (
		process.env.NEXT_PUBLIC_APP_URL ||
		process.env.APP_URL ||
		"https://www.caalmsolutions.com"
	).replace(/\/$/, "");
}

async function lookupUserEmail(userId: string): Promise<string | null> {
	try {
		const { tablesDB } = await createAdminClient();
		try {
			const row = await tablesDB.getRow({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.usersCollectionId!,
				rowId: userId,
			});
			const flat = flattenTableRow(row as Record<string, unknown>);
			return String(flat.email || "").trim() || null;
		} catch {
			const listed = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId!,
				tableId: appwriteConfig.usersCollectionId!,
				queries: [Query.equal("accountId", userId), Query.limit(1)],
			});
			const row = listed.rows?.[0] as Record<string, unknown> | undefined;
			if (!row) return null;
			const flat = flattenTableRow(row);
			return String(flat.email || "").trim() || null;
		}
	} catch {
		return null;
	}
}

async function sendApprovalActionEmail(input: {
	to: string;
	title: string;
	message: string;
	actionUrl: string;
}): Promise<void> {
	if (isDemoMode()) {
		console.log("[demo] Approval email no-op:", {
			to: input.to,
			title: input.title,
		});
		return;
	}
	const { mailgunService } = await import("@/lib/services/mailgun");
	await mailgunService.sendEmail({
		to: input.to,
		subject: input.title,
		text: `${input.message}\n\nReview: ${input.actionUrl}`,
		html: `<p>${input.message}</p><p><a href="${input.actionUrl}" style="display:inline-block;padding:10px 16px;background:#0f5384;color:#fff;border-radius:8px;text-decoration:none;">Review &amp; decide</a></p><p style="color:#64748b;font-size:12px;">Or open: ${input.actionUrl}</p>`,
	});
}

/**
 * Notify assignees with an in-app notification and a one-time email approve link.
 * actionUrl is stored as a top-level notification field via trigger metadata.
 */
export async function notifyApprovalAssignees(input: {
	entityType: "contract" | "license";
	entityId: string;
	userIds: string[];
	title: string;
	message: string;
	metadata?: Record<string, unknown>;
}): Promise<void> {
	const base = appBaseUrl();
	for (const userId of uniqueIds(input.userIds)) {
		try {
			let actionUrl =
				input.entityType === "license"
					? "/licenses/approvals"
					: "/contracts/approvals";
			let actionText = "Open Approvals";
			try {
				const token = await issueApprovalActionToken({
					entityType: input.entityType,
					entityId: input.entityId,
					userId,
				});
				actionUrl = `${base}/approve/${token}`;
				actionText = "Review in email link";
			} catch {
				/* token collection may not exist yet */
			}

			await triggerNotification("info", {
				userId,
				title: input.title,
				message: input.message,
				priority: "high",
				metadata: {
					...(input.metadata || {}),
					[input.entityType === "license" ? "licenseId" : "contractId"]:
						input.entityId,
					actionUrl,
					actionText,
				},
			});

			if (actionUrl.includes("/approve/")) {
				const email = await lookupUserEmail(userId);
				if (email) {
					try {
						await sendApprovalActionEmail({
							to: email,
							title: input.title,
							message: input.message,
							actionUrl,
						});
					} catch (emailError) {
						console.warn(
							`Approval email failed for ${userId}:`,
							emailError,
						);
					}
				}
			}
		} catch (error) {
			console.error(`Failed to notify approval assignee ${userId}:`, error);
		}
	}
}
