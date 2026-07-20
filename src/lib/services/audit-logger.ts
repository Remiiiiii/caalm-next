import { ID, Query } from "node-appwrite";
import {
	type AuditAction,
	type AuditChangeDiff,
	type AuditModule,
	extractStructuredFields,
	packStructuredMetadata,
} from "@/lib/audits/audit-log.utils";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export interface AuditLogEntry {
	event_id: string;
	event_title: string;
	action: AuditAction;
	source: "caalm" | "outlook";
	user_id: string;
	user_name: string;
	user_email: string;
	orgId?: string;
	ip_address?: string;
	user_agent?: string;
	reason?: string;
	status: "success" | "failed" | "pending";
	error_message?: string;
	metadata?: Record<string, unknown>;
	module?: AuditModule;
	target_type?: string;
	target_id?: string;
	target_label?: string;
	summary?: string;
	changes?: AuditChangeDiff[];
	correlation_id?: string;
	created_at?: string;
}

export interface AuditFilters {
	startDate?: string;
	endDate?: string;
	userId?: string;
	action?: string;
	status?: string;
	eventId?: string;
	module?: AuditModule;
	orgId?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface AuditLogsPage {
	logs: AuditLogEntry[];
	total: number;
	limit: number;
	offset: number;
}

export interface AuditDashboardStats {
	totalEvents: number;
	failedActions: number;
	adminChanges: number;
	exports: number;
	totalDeletions: number;
	successRate: number;
	failedSyncs: number;
	pendingSyncs: number;
	deletionsByUser: Array<{ user_name: string; count: number }>;
	deletionsByDate: Array<{ date: string; count: number }>;
	eventsByDate: Array<{ date: string; count: number }>;
}

function parseChanges(value: unknown): AuditChangeDiff[] | undefined {
	if (!value) return undefined;
	if (Array.isArray(value)) return value as AuditChangeDiff[];
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			return Array.isArray(parsed) ? (parsed as AuditChangeDiff[]) : undefined;
		} catch {
			return undefined;
		}
	}
	return undefined;
}

function mapRowToEntry(row: Record<string, unknown>): AuditLogEntry {
	let metadata: Record<string, unknown> | null = null;
	if (typeof row.metadata === "string" && row.metadata) {
		try {
			metadata = JSON.parse(row.metadata);
		} catch {
			metadata = null;
		}
	} else if (row.metadata && typeof row.metadata === "object") {
		metadata = row.metadata as Record<string, unknown>;
	}

	const eventTitle = String(row.event_title || "");
	const userName = String(row.user_name || "Unknown");
	const action = String(row.action || "update") as AuditAction;
	const structured = extractStructuredFields(
		metadata,
		eventTitle,
		userName,
		action,
	);

	const topLevelChanges = parseChanges(row.changes);

	return {
		event_id: String(row.event_id || ""),
		event_title: eventTitle,
		action,
		source: (row.source as "caalm" | "outlook") || "caalm",
		user_id: String(row.user_id || ""),
		user_name: userName,
		user_email: String(row.user_email || ""),
		orgId: row.orgId ? String(row.orgId) : undefined,
		ip_address: row.ip_address ? String(row.ip_address) : undefined,
		user_agent: row.user_agent ? String(row.user_agent) : undefined,
		reason: row.reason ? String(row.reason) : undefined,
		status: (row.status as AuditLogEntry["status"]) || "success",
		error_message: row.error_message
			? String(row.error_message)
			: undefined,
		metadata: structured.publicMetadata || undefined,
		module:
			(typeof row.module === "string"
				? (row.module as AuditModule)
				: undefined) || structured.module,
		target_type:
			(typeof row.target_type === "string" ? row.target_type : undefined) ||
			structured.target_type,
		target_id:
			(typeof row.target_id === "string" ? row.target_id : undefined) ||
			structured.target_id,
		target_label:
			(typeof row.target_label === "string" ? row.target_label : undefined) ||
			structured.target_label,
		summary:
			(typeof row.summary === "string" ? row.summary : undefined) ||
			structured.summary,
		changes: topLevelChanges || structured.changes,
		correlation_id:
			(typeof row.correlation_id === "string"
				? row.correlation_id
				: undefined) || structured.correlation_id,
		created_at: row.$createdAt ? String(row.$createdAt) : undefined,
	};
}

function buildBaseQueries(filters?: AuditFilters): string[] {
	const queries: string[] = [];

	if (filters?.startDate) {
		queries.push(Query.greaterThanEqual("$createdAt", filters.startDate));
	}
	if (filters?.endDate) {
		queries.push(Query.lessThanEqual("$createdAt", filters.endDate));
	}
	if (filters?.userId) {
		queries.push(Query.equal("user_id", filters.userId));
	}
	if (filters?.action && filters.action !== "all") {
		queries.push(Query.equal("action", filters.action));
	}
	if (filters?.status && filters.status !== "all") {
		queries.push(Query.equal("status", filters.status));
	}
	if (filters?.eventId) {
		queries.push(Query.equal("event_id", filters.eventId));
	}
	if (filters?.orgId) {
		queries.push(Query.equal("orgId", filters.orgId));
	}
	if (filters?.module) {
		queries.push(Query.equal("module", filters.module));
	}

	queries.push(Query.orderDesc("$createdAt"));
	return queries;
}

/**
 * Log an audit event to the database.
 * Writes structured fields as top-level columns and mirrors them in metadata
 * for backward compatibility.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
	try {
		if (!appwriteConfig.databaseId || !appwriteConfig.auditLogsCollectionId) {
			console.error("Missing required Appwrite configuration for audit logs");
			return;
		}

		const adminClient = await createAdminClient();
		const orgId = entry.orgId || "default_organization";

		const structuredMeta = packStructuredMetadata(entry.metadata, {
			module: entry.module,
			target_type: entry.target_type,
			target_id: entry.target_id,
			target_label: entry.target_label,
			summary: entry.summary,
			changes: entry.changes,
			correlation_id: entry.correlation_id,
		});

		let metadataString: string | null = null;
		if (Object.keys(structuredMeta).length > 0) {
			metadataString = JSON.stringify(structuredMeta);
			if (metadataString.length > 2000) {
				const essential: Record<string, unknown> = {
					module: structuredMeta.module,
					target_type: structuredMeta.target_type,
					target_id: structuredMeta.target_id,
					target_label: structuredMeta.target_label,
					summary: structuredMeta.summary,
					correlation_id: structuredMeta.correlation_id,
				};
				if (structuredMeta.contractId) {
					essential.contractId = structuredMeta.contractId;
				}
				if (structuredMeta.notificationId) {
					essential.notificationId = structuredMeta.notificationId;
				}
				metadataString = JSON.stringify(essential);
				if (metadataString.length > 2000) {
					metadataString = `${metadataString.substring(0, 1997)}...`;
				}
			}
		}

		// Map extended actions onto schema-safe enum values
		const schemaAction =
			entry.action === "export"
				? "create"
				: entry.action === "login" || entry.action === "logout"
					? "update"
					: entry.action;

		const changesString = entry.changes
			? JSON.stringify(entry.changes).slice(0, 2000)
			: null;

		const auditData: Record<string, unknown> = {
			event_id: entry.event_id,
			event_title: entry.event_title,
			action: schemaAction,
			source: entry.source,
			user_id: entry.user_id,
			user_name: entry.user_name,
			user_email: entry.user_email,
			orgId,
			ip_address: entry.ip_address || null,
			user_agent: entry.user_agent || null,
			reason: entry.reason || null,
			status: entry.status,
			error_message: entry.error_message || null,
			metadata: metadataString,
			module: entry.module || null,
			target_type: entry.target_type || null,
			target_id: entry.target_id || null,
			target_label: entry.target_label || null,
			summary: entry.summary || null,
			correlation_id: entry.correlation_id || null,
			changes: changesString,
		};

		try {
			await adminClient.tablesDB.createRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.auditLogsCollectionId,
				rowId: ID.unique(),
				data: auditData,
			});
		} catch (createError: unknown) {
			const err = createError as {
				message?: string;
				code?: string;
				type?: string;
			};
			console.error("Error creating audit log row:", {
				errorMessage: err?.message,
				errorCode: err?.code,
				errorType: err?.type,
			});
			throw createError;
		}
	} catch (error) {
		console.error("Error logging audit event:", error);
	}
}

/**
 * Get audit logs with optional filters (legacy array return).
 */
export async function getAuditLogs(
	filters?: AuditFilters,
): Promise<AuditLogEntry[]> {
	const page = await getAuditLogsPage(filters);
	return page.logs;
}

/**
 * Get paginated audit logs with total count.
 */
export async function getAuditLogsPage(
	filters?: AuditFilters,
): Promise<AuditLogsPage> {
	if (!appwriteConfig.databaseId || !appwriteConfig.auditLogsCollectionId) {
		throw new Error("Missing required Appwrite configuration for audit logs");
	}

	const adminClient = await createAdminClient();
	const limit = filters?.limit ?? 50;
	const offset = filters?.offset ?? 0;
	const needsClientFilter = Boolean(filters?.search);

	const baseQueries = buildBaseQueries(filters);

	if (!needsClientFilter) {
		const response = await adminClient.tablesDB.listRows({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.auditLogsCollectionId,
			queries: [
				...baseQueries,
				Query.limit(limit),
				Query.offset(offset),
			],
		});

		return {
			logs: response.rows.map((row: Record<string, unknown>) =>
				mapRowToEntry(row),
			),
			total: response.total ?? response.rows.length,
			limit,
			offset,
		};
	}

	// Search requires client-side filtering; fetch a larger window then page.
	const response = await adminClient.tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: appwriteConfig.auditLogsCollectionId,
		queries: [...baseQueries, Query.limit(500)],
	});

	let logs = response.rows.map((row: Record<string, unknown>) =>
		mapRowToEntry(row),
	);

	if (filters?.search) {
		const q = filters.search.trim().toLowerCase();
		logs = logs.filter(
			(log) =>
				log.event_title.toLowerCase().includes(q) ||
				log.user_name.toLowerCase().includes(q) ||
				log.user_email.toLowerCase().includes(q) ||
				(log.summary || "").toLowerCase().includes(q) ||
				(log.target_label || "").toLowerCase().includes(q),
		);
	}

	const total = logs.length;
	const paged = logs.slice(offset, offset + limit);

	return { logs: paged, total, limit, offset };
}

/**
 * Get audit statistics for dashboard cards and activity chart.
 */
export async function getAuditStats(): Promise<AuditDashboardStats> {
	if (!appwriteConfig.databaseId || !appwriteConfig.auditLogsCollectionId) {
		throw new Error("Missing required Appwrite configuration for audit logs");
	}

	const adminClient = await createAdminClient();
	const response = await adminClient.tablesDB.listRows({
		databaseId: appwriteConfig.databaseId,
		tableId: appwriteConfig.auditLogsCollectionId,
		queries: [Query.orderDesc("$createdAt"), Query.limit(1000)],
	});

	const rows = response.rows as Array<Record<string, unknown>>;
	const logs = rows.map(mapRowToEntry);

	const totalEvents = response.total ?? logs.length;
	const failedActions = logs.filter((log) => log.status === "failed").length;
	const adminChanges = logs.filter(
		(log) =>
			log.module === "governance" ||
			log.event_title.toLowerCase().includes("role") ||
			log.event_id.toLowerCase().includes("rbac"),
	).length;
	const exports = logs.filter(
		(log) =>
			log.module === "system" &&
			(log.event_title.toLowerCase().includes("export") ||
				log.action === "export" ||
				(log.metadata as Record<string, unknown> | undefined)?.isExport ===
					true),
	).length;

	const totalDeletions = logs.filter((log) => log.action === "delete").length;
	const successfulDeletions = logs.filter(
		(log) => log.action === "delete" && log.status === "success",
	).length;
	const failedSyncs = logs.filter(
		(log) => log.action === "sync_delete" && log.status === "failed",
	).length;
	const pendingSyncs = logs.filter(
		(log) => log.action === "sync_delete" && log.status === "pending",
	).length;

	const userCounts: Record<string, number> = {};
	for (const log of logs) {
		if (log.action === "delete") {
			userCounts[log.user_name] = (userCounts[log.user_name] || 0) + 1;
		}
	}
	const deletionsByUser = Object.entries(userCounts)
		.map(([user_name, count]) => ({ user_name, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const deletionDateCounts: Record<string, number> = {};
	const eventDateCounts: Record<string, number> = {};

	for (const log of logs) {
		if (!log.created_at) continue;
		const created = new Date(log.created_at);
		if (created < thirtyDaysAgo) continue;
		const date = created.toISOString().split("T")[0];
		eventDateCounts[date] = (eventDateCounts[date] || 0) + 1;
		if (log.action === "delete") {
			deletionDateCounts[date] = (deletionDateCounts[date] || 0) + 1;
		}
	}

	const deletionsByDate = Object.entries(deletionDateCounts)
		.map(([date, count]) => ({ date, count }))
		.sort((a, b) => a.date.localeCompare(b.date));

	const eventsByDate = Object.entries(eventDateCounts)
		.map(([date, count]) => ({ date, count }))
		.sort((a, b) => a.date.localeCompare(b.date));

	return {
		totalEvents,
		failedActions,
		adminChanges,
		exports,
		totalDeletions,
		successRate:
			totalDeletions > 0 ? (successfulDeletions / totalDeletions) * 100 : 0,
		failedSyncs,
		pendingSyncs,
		deletionsByUser,
		deletionsByDate,
		eventsByDate,
	};
}
