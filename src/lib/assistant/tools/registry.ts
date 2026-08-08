import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { listCalendarApprovalRequests } from "@/lib/actions/calendar-approval.actions";
import { generateReport } from "@/lib/actions/report.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { retrieveKnowledge } from "@/lib/assistant/knowledge/retrieve";
import { AUDIT_TOOLS } from "@/lib/assistant/tools/auditTools";
import { CALENDAR_TOOLS } from "@/lib/assistant/tools/calendarTools";
import { TASK_TOOLS } from "@/lib/assistant/tools/taskTools";
import {
	formatLocalDate,
	hasAll,
	searchContractsTable,
	searchLicensesTable,
} from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { logAuditEvent } from "@/lib/services/audit-logger";

const CORE_TOOLS: ToolDefinition[] = [
	{
		name: "get_page_help",
		description: "Get CAALM product help for the current page or a topic",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				topic: { type: "string", description: "User question or topic" },
			},
			required: ["topic"],
		},
		handler: async (ctx, args) => {
			const topic = String(args.topic ?? "");
			const { contextText, sources } = retrieveKnowledge(topic, ctx.pathname);
			return { result: { contextText, sources } };
		},
	},
	{
		name: "navigate",
		description: "Suggest an in-app navigation path for the user",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				href: { type: "string", description: "Internal path e.g. /contracts" },
			},
			required: ["href"],
		},
		handler: async (_ctx, args) => {
			const href = String(args.href ?? "");
			if (!href.startsWith("/")) {
				return { result: { error: "Invalid path" } };
			}
			return { clientAction: { type: "navigate", href }, result: { href } };
		},
	},
	{
		name: "search_contracts",
		description: "Search contracts in the user's organization",
		requiredPermissions: [PERMISSIONS.CONTRACTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { query: { type: "string" } },
			required: ["query"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])) {
				return { result: { error: "Missing contracts.view permission" } };
			}
			const rows = await searchContractsTable(ctx, String(args.query ?? ""));
			return { result: { contracts: rows } };
		},
	},
	{
		name: "search_licenses",
		description: "Search licenses in the user's organization",
		requiredPermissions: [PERMISSIONS.LICENSES.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: { query: { type: "string" } },
			required: ["query"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.LICENSES.VIEW])) {
				return { result: { error: "Missing licenses.view permission" } };
			}
			const rows = await searchLicensesTable(ctx, String(args.query ?? ""));
			return { result: { licenses: rows } };
		},
	},
	{
		name: "list_pending_approvals",
		description: "List pending calendar approval requests",
		requiredPermissions: [PERMISSIONS.EVENTS.APPROVE],
		mutating: false,
		parameters: { type: "object", properties: {} },
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.EVENTS.APPROVE])) {
				return { result: { error: "Missing events.approve permission" } };
			}
			const approvals = await listCalendarApprovalRequests({
				status: "pending",
			});
			return { result: { approvals: approvals.slice(0, 15) } };
		},
	},
	{
		name: "list_expirations",
		description:
			"List contracts and licenses expiring within a number of days (default 90). Use when the user asks what's expiring, due soon, coming up for renewal, or wants an expiration brief.",
		requiredPermissions: [
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.LICENSES.VIEW,
		],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				days: {
					type: "number",
					description: "Look-ahead window in days. Default 90.",
				},
			},
		},
		handler: async (ctx, args) => {
			const days = Math.min(Math.max(Number(args.days) || 90, 1), 365);
			const now = new Date();
			const today = formatLocalDate(now);
			const horizon = formatLocalDate(
				new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
			);
			const { tablesDB } = await createAdminClient();

			const contractsPromise = hasAll(ctx, [PERMISSIONS.CONTRACTS.VIEW])
				? tablesDB.listRows({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.contractsCollectionId || "contracts",
						queries: [
							Query.equal("orgId", ctx.orgId),
							Query.greaterThanEqual("contractExpiryDate", today),
							Query.lessThanEqual("contractExpiryDate", horizon),
							Query.orderAsc("contractExpiryDate"),
							Query.limit(10),
						],
					})
				: Promise.resolve({ rows: [] as Record<string, unknown>[] });

			const licensesPromise = hasAll(ctx, [PERMISSIONS.LICENSES.VIEW])
				? tablesDB.listRows({
						databaseId: appwriteConfig.databaseId!,
						tableId: appwriteConfig.licensesCollectionId || "licenses",
						queries: [
							Query.equal("orgId", ctx.orgId),
							Query.greaterThanEqual("licenseExpiryDate", today),
							Query.lessThanEqual("licenseExpiryDate", horizon),
							Query.orderAsc("licenseExpiryDate"),
							Query.limit(10),
						],
					})
				: Promise.resolve({ rows: [] as Record<string, unknown>[] });

			const [contracts, licenses] = await Promise.all([
				contractsPromise,
				licensesPromise,
			]);

			return {
				result: {
					days,
					contracts: contracts.rows.map((r) => ({
						id: r.$id,
						name: r.contractName ?? r.name,
						expiryDate: r.contractExpiryDate,
						status: r.status,
					})),
					licenses: licenses.rows.map((r) => ({
						id: r.$id,
						name: r.licenseName ?? r.name,
						expirationDate: r.licenseExpiryDate,
						status: r.status,
					})),
					contractsHref: "/contracts",
					licensesHref: "/licenses",
				},
			};
		},
	},
	{
		name: "generate_report",
		description: "Start an AI report generation for the user's department",
		requiredPermissions: [PERMISSIONS.SETTINGS.VIEW],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				department: { type: "string" },
			},
			required: ["department"],
		},
		handler: async (ctx, args) => {
			const userName =
				(ctx.user as { fullName?: string }).fullName ||
				ctx.user.name ||
				ctx.user.email ||
				"User";
			const division =
				(ctx.user.prefs as { division?: string })?.division ||
				String(args.department ?? "General");
			const report = await generateReport({
				userId: ctx.user.$id,
				department: String(args.department ?? division),
				userName,
			});
			await logAuditEvent({
				event_id: `assistant_report_${report.$id}`,
				event_title: `Assistant started report: ${report.title}`,
				action: "create",
				source: "caalm",
				user_id: ctx.user.$id,
				user_name: userName,
				user_email: ctx.user.email || "",
				status: "success",
				orgId: ctx.orgId,
				module: "system",
				target_type: "report",
				target_id: report.$id,
				target_label: report.title,
				summary: `CAALM assistant started report generation`,
				metadata: { source: "ai_assistant" },
			}).catch(() => undefined);
			return { result: { reportId: report.$id, status: report.status } };
		},
	},
];

export const ASSISTANT_TOOLS: ToolDefinition[] = [
	...CORE_TOOLS,
	...TASK_TOOLS,
	...CALENDAR_TOOLS,
	...AUDIT_TOOLS,
];

export function getToolsForPermissions(
	permissions: ToolContext["permissions"],
) {
	return ASSISTANT_TOOLS.filter((tool) =>
		tool.requiredPermissions.every((p) => permissions.includes(p)),
	);
}

export async function runToolByName(
	ctx: ToolContext,
	toolName: string,
	args: Record<string, unknown>,
): Promise<{
	result?: unknown;
	clientAction?: { type: "navigate"; href: string };
	error?: string;
}> {
	const tool = ASSISTANT_TOOLS.find((t) => t.name === toolName);
	if (!tool) return { error: "Unknown tool" };
	if (!tool.requiredPermissions.every((p) => ctx.permissions.includes(p))) {
		return { error: "Insufficient permissions for tool" };
	}
	try {
		return await tool.handler(ctx, args);
	} catch (error) {
		console.error(`[assistant tool ${toolName}] failed:`, error);
		return {
			result: {
				error:
					"I ran into a problem completing that. Try rephrasing, or use the page directly.",
			},
		};
	}
}
