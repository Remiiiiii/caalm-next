import { PERMISSIONS } from "@/constants/permissions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { fetchBriefing } from "@/lib/briefing/fetch-briefing";
import { listNewsArticles } from "@/lib/database/news-articles";
import { serializeNewsArticle } from "@/lib/news/serialize";
import { getUserRoles } from "@/lib/rbac/permissions";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { notificationService } from "@/lib/services/notificationService";
import { twilioService } from "@/lib/services/twilioService";

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

export const NEWS_TOOLS: ToolDefinition[] = [
	{
		name: "get_morning_briefing",
		description:
			"Return the morning briefing: world markets, world headlines, and the org's published company news. Read-only.",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				companyNewsLimit: { type: "number" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AI.CHAT])) {
				return { result: { error: "Missing ai.chat permission" } };
			}
			const companyNewsLimit = Math.min(Number(args.companyNewsLimit) || 5, 10);

			const briefing = await fetchBriefing();

			const roles = ctx.orgId
				? await getUserRoles(ctx.user.$id, ctx.orgId)
				: [];
			const { articles } = await listNewsArticles({
				status: "published",
				orgId: ctx.orgId,
				limit: companyNewsLimit,
				forReader: true,
				audience: {
					department: (ctx.user as { department?: string }).department,
					roleNames: roles
						.map((role) => role.roleName)
						.filter((name): name is string => Boolean(name)),
				},
			});

			return {
				result: {
					markets: briefing.markets,
					worldNews: briefing.news.slice(0, 5).map((item) => ({
						title: item.title,
						source: item.source,
						publishedAt: item.publishedAt,
						articleUrl: item.articleUrl,
					})),
					companyNews: articles.map(serializeNewsArticle),
				},
			};
		},
	},
	{
		name: "list_notifications",
		description:
			"List the caller's own notifications, or mark one of the caller's own notifications as read. Use action 'mark_read' with notificationId to mark one read. Never affects another user's notifications.",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				action: { type: "string", enum: ["list", "mark_read"] },
				status: { type: "string", enum: ["all", "read", "unread"] },
				limit: { type: "number" },
				notificationId: { type: "string" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.AI.CHAT])) {
				return { result: { error: "Missing ai.chat permission" } };
			}

			if (String(args.action ?? "list") === "mark_read") {
				const notificationId = String(args.notificationId ?? "").trim();
				if (!notificationId) {
					return { result: { error: "Give the notificationId to mark read." } };
				}
				// Ownership check: only mark it read if it shows up among the
				// caller's own notifications (the service resolves both the user's
				// doc id and account id forms) — never trust the id alone.
				const owned = await notificationService.getNotifications(
					ctx.user.$id,
					{},
					undefined,
					1,
					500,
				);
				const match = owned.data.find((n) => n.$id === notificationId);
				if (!match) {
					return {
						result: {
							error: `I couldn't find a notification with id "${notificationId}" for you.`,
						},
					};
				}
				const updated = await notificationService.markAsRead(notificationId);
				return {
					result: { notificationId: updated.$id, read: updated.read },
				};
			}

			const status = (args.status as "all" | "read" | "unread") || "unread";
			const limit = Math.min(Number(args.limit) || 10, 25);
			const { data, total } = await notificationService.getNotifications(
				ctx.user.$id,
				{ status },
				undefined,
				1,
				limit,
			);
			return {
				result: {
					notifications: data.map((n) => ({
						id: n.$id,
						title: n.title,
						message: n.message,
						type: n.type,
						read: n.read,
						priority: n.priority,
						createdAt: n.$createdAt,
					})),
					total,
				},
			};
		},
	},
	{
		name: "send_sms_test",
		description:
			"Send a test SMS to the caller's own on-file phone number (requires user confirmation before execution). Admin diagnostic only; never sends to an arbitrary number.",
		requiredPermissions: [PERMISSIONS.SETTINGS.EDIT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				message: { type: "string" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.SETTINGS.EDIT])) {
				return { result: { error: "Missing settings.edit permission" } };
			}

			if (!twilioService.isConfigured()) {
				return {
					result: {
						available: false,
						message:
							"SMS test isn't available — Twilio isn't configured for this environment.",
					},
				};
			}

			const settings = await notificationService.getNotificationSettings(
				ctx.user.$id,
			);
			if (!settings?.phone_number) {
				return {
					result: {
						error:
							"No phone number on file. Add one in Notification Settings before testing SMS.",
					},
				};
			}

			const to = twilioService.formatPhoneNumber(settings.phone_number);
			const message = `[TEST] ${String(args.message ?? "This is a test message from CAALM.").slice(0, 140)}`;

			try {
				await twilioService.sendSMS({ to, message, priority: "low" });
			} catch (error) {
				return { result: { error: (error as Error).message } };
			}

			await logAuditEvent({
				event_id: `assistant_sms_test_${ctx.user.$id}_${Date.now()}`,
				event_title: "Assistant sent a test SMS",
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: actorName(ctx),
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "sms_test",
				target_id: ctx.user.$id,
				target_label: to,
				summary: `CAALM assistant sent a test SMS to the caller's own on-file number`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);

			return { result: { success: true, to, message: "Test SMS sent." } };
		},
	},
];
