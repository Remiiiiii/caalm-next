import { PERMISSIONS } from "@/constants/permissions";
import {
	getCalendarIntegrationStatus,
	getValidIntegration,
} from "@/lib/actions/calendar-integration.actions";
import {
	getGmailIntegrationStatus,
	getValidGmailAccessToken,
} from "@/lib/actions/gmail-integration.actions";
import {
	getOutlookMailIntegrationStatus,
	getValidOutlookMailAccessToken,
} from "@/lib/actions/outlook-mail-integration.actions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolDefinition } from "@/lib/assistant/tools/types";
import { hubspotConnector } from "@/lib/crm/connectors/hubspot.connector";
import { salesforceConnector } from "@/lib/crm/connectors/salesforce.connector";
import { createDraftFromCrmDeal } from "@/lib/crm/create-draft-from-deal";
import { getCrmIntegration } from "@/lib/crm/integrations.repository";
import { getFreshHubSpotAccessToken } from "@/lib/crm/tokens";
import { type CrmProvider, parseCrmConfig } from "@/lib/crm/types";
import { sendMessage as sendGmailMessage } from "@/lib/gmail/client";
import { sendMessage as sendOutlookMessage } from "@/lib/microsoft/mail-client";
import { logAuditEvent } from "@/lib/services/audit-logger";

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

export const INTEGRATION_TOOLS: ToolDefinition[] = [
	{
		name: "send_gmail",
		description:
			"Draft and send an email from the user's own connected Gmail account (requires user confirmation before execution). Fails with a clear message if Gmail is not connected.",
		requiredPermissions: [PERMISSIONS.INTEGRATIONS.GMAIL_MANAGE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				to: { type: "string" },
				subject: { type: "string" },
				body: { type: "string" },
				contentType: { type: "string", enum: ["text", "html"] },
			},
			required: ["to", "subject", "body"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.INTEGRATIONS.GMAIL_MANAGE])) {
				return {
					result: { error: "Missing integrations.gmail.manage permission" },
				};
			}
			const to = String(args.to ?? "").trim();
			const subject = String(args.subject ?? "").trim();
			const body = String(args.body ?? "").trim();
			if (!to || !subject) {
				return { result: { error: "Give the recipient (to) and a subject." } };
			}
			const access = await getValidGmailAccessToken(ctx.user.$id);
			if (!access) {
				return {
					result: {
						error:
							"Your Gmail account isn't connected. Connect it in Settings → Integrations.",
					},
				};
			}
			try {
				const result = await sendGmailMessage(access.accessToken, {
					to,
					subject,
					body,
					fromEmail: access.email,
					contentType: args.contentType === "html" ? "html" : "text",
				});
				await logAuditEvent({
					event_id: `assistant_gmail_send_${result.id}`,
					event_title: `Assistant sent Gmail: ${subject}`,
					action: "create",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "system",
					target_type: "email",
					target_id: result.id,
					target_label: subject,
					summary: `CAALM assistant sent a Gmail message to ${to}`,
					metadata: { source: "ai_assistant", provider: "gmail" },
				}).catch(() => undefined);
				return { result: { success: true, messageId: result.id } };
			} catch (error) {
				return {
					result: {
						error: `Failed to send Gmail message: ${(error as Error).message}`,
					},
				};
			}
		},
	},
	{
		name: "send_outlook_mail",
		description:
			"Draft and send an email from the user's own connected Outlook account (requires user confirmation before execution). Fails with a clear message if Outlook is not connected.",
		requiredPermissions: [PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				to: { type: "string" },
				subject: { type: "string" },
				body: { type: "string" },
				contentType: { type: "string", enum: ["text", "html"] },
			},
			required: ["to", "subject", "body"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT])) {
				return {
					result: { error: "Missing integrations.outlook.connect permission" },
				};
			}
			const to = String(args.to ?? "").trim();
			const subject = String(args.subject ?? "").trim();
			const body = String(args.body ?? "").trim();
			if (!to || !subject) {
				return { result: { error: "Give the recipient (to) and a subject." } };
			}
			const access = await getValidOutlookMailAccessToken(ctx.user.$id);
			if (!access) {
				return {
					result: {
						error:
							"Your Outlook account isn't connected. Connect it in Settings → Integrations.",
					},
				};
			}
			try {
				const result = await sendOutlookMessage(access.accessToken, {
					to,
					subject,
					body,
					contentType: args.contentType === "html" ? "html" : "text",
				});
				await logAuditEvent({
					event_id: `assistant_outlook_send_${result.id}`,
					event_title: `Assistant sent Outlook mail: ${subject}`,
					action: "create",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "system",
					target_type: "email",
					target_id: result.id,
					target_label: subject,
					summary: `CAALM assistant sent an Outlook message to ${to}`,
					metadata: { source: "ai_assistant", provider: "outlook" },
				}).catch(() => undefined);
				return { result: { success: true, messageId: result.id } };
			} catch (error) {
				return {
					result: {
						error: `Failed to send Outlook message: ${(error as Error).message}`,
					},
				};
			}
		},
	},
	{
		name: "check_integration_status",
		description:
			"Report whether Gmail, Outlook mail, Outlook calendar, and CRM (HubSpot/Salesforce) are connected. Use this when the user asks why an email or sync isn't working. Read-only.",
		requiredPermissions: [PERMISSIONS.SETTINGS.INTEGRATIONS],
		mutating: false,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.SETTINGS.INTEGRATIONS])) {
				return {
					result: { error: "Missing settings.integrations permission" },
				};
			}
			const [gmail, outlookMail, outlookCalendar, hubspot, salesforce] =
				await Promise.all([
					getGmailIntegrationStatus(ctx.user.$id),
					getOutlookMailIntegrationStatus(ctx.user.$id),
					getCalendarIntegrationStatus(ctx.user.$id, "microsoft"),
					getCrmIntegration(ctx.orgId, "hubspot"),
					getCrmIntegration(ctx.orgId, "salesforce"),
				]);
			return {
				result: {
					gmail,
					outlookMail,
					outlookCalendar,
					crm: {
						hubspot: hubspot
							? { status: hubspot.status, lastError: hubspot.last_error }
							: { status: "disconnected" },
						salesforce: salesforce
							? { status: salesforce.status, lastError: salesforce.last_error }
							: { status: "disconnected" },
					},
				},
			};
		},
	},
	{
		name: "sync_outlook_calendar",
		description:
			"Trigger an Outlook calendar sync for the current user (requires user confirmation before execution). Fails with a clear message if Outlook calendar is not connected.",
		requiredPermissions: [PERMISSIONS.INTEGRATIONS.OUTLOOK_SYNC],
		mutating: true,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.INTEGRATIONS.OUTLOOK_SYNC])) {
				return {
					result: { error: "Missing integrations.outlook.sync permission" },
				};
			}
			const integration = await getValidIntegration(ctx.user.$id, "microsoft");
			if (!integration) {
				return {
					result: {
						error:
							"Your Outlook calendar isn't connected. Connect it in Settings → Integrations.",
					},
				};
			}
			return {
				result: {
					available: false,
					message:
						"Syncing your Outlook calendar from chat isn't available yet. Go to Settings → Integrations → Outlook Calendar and use Sync now.",
				},
			};
		},
	},
	{
		name: "create_crm_draft_from_deal",
		description:
			"Create a draft contract from a HubSpot deal (requires user confirmation before execution). Give the dealId; provider defaults to hubspot. Salesforce is not yet available (requires Enterprise setup).",
		requiredPermissions: [
			PERMISSIONS.SETTINGS.INTEGRATIONS,
			PERMISSIONS.CONTRACTS.CREATE,
		],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				dealId: { type: "string" },
				provider: { type: "string", enum: ["hubspot", "salesforce"] },
			},
			required: ["dealId"],
		},
		handler: async (ctx, args) => {
			if (
				!hasAll(ctx, [
					PERMISSIONS.SETTINGS.INTEGRATIONS,
					PERMISSIONS.CONTRACTS.CREATE,
				])
			) {
				return {
					result: {
						error:
							"Missing settings.integrations or contracts.create permission",
					},
				};
			}
			const dealId = String(args.dealId ?? "").trim();
			if (!dealId) {
				return { result: { error: "Give the dealId." } };
			}
			const provider = (
				args.provider === "salesforce" ? "salesforce" : "hubspot"
			) as CrmProvider;

			const integration = await getCrmIntegration(ctx.orgId, provider);
			if (!integration || integration.status !== "connected") {
				return {
					result: {
						error: `${provider === "hubspot" ? "HubSpot" : "Salesforce"} isn't connected for this org. Connect it in Settings → Integrations.`,
					},
				};
			}

			try {
				const config = parseCrmConfig(integration.config_json);
				const deal =
					provider === "hubspot"
						? await hubspotConnector.getDeal(
								await getFreshHubSpotAccessToken(integration),
								dealId,
								config.fieldMap,
							)
						: await salesforceConnector.getDeal("", dealId);

				const draft = await createDraftFromCrmDeal({
					orgId: ctx.orgId,
					ownerId: ctx.user.$id,
					deal,
					provider,
					department: config.department,
					division: config.division,
				});

				if (!draft.alreadyLinked) {
					await logAuditEvent({
						event_id: `assistant_crm_draft_${draft.contractId}`,
						event_title: `Assistant created CRM draft: ${draft.payload.contractName}`,
						action: "create",
						source: "caalm",
						user_id: ctx.user.$id,
						user_name: actorName(ctx),
						user_email: ctx.user.email || "",
						status: "success",
						orgId: ctx.orgId,
						module: "contracts",
						target_type: "contract",
						target_id: draft.contractId,
						target_label: draft.payload.contractName,
						summary: `CAALM assistant created a draft contract from ${provider} deal ${dealId}`,
						metadata: { source: "ai_assistant", provider, dealId },
					}).catch(() => undefined);
				}

				return {
					result: {
						contractId: draft.contractId,
						alreadyLinked: draft.alreadyLinked,
						contractName: draft.payload.contractName,
					},
				};
			} catch (error) {
				return { result: { error: (error as Error).message } };
			}
		},
	},
];
