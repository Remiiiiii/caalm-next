import type { StyledXlsxInput } from "@/lib/export/styled-xlsx";
import {
	type AuditFilters,
	getAuditLogs,
	getAuditStats,
} from "@/lib/services/audit-logger";

/**
 * Get audit logs with filters
 */
export async function getAuditLogsAction(filters: AuditFilters) {
	try {
		return await getAuditLogs(filters);
	} catch (error) {
		console.error("Error in getAuditLogsAction:", error);
		throw error;
	}
}

/**
 * Get audit statistics
 */
export async function getAuditStatsAction() {
	try {
		return await getAuditStats();
	} catch (error) {
		console.error("Error in getAuditStatsAction:", error);
		throw error;
	}
}

/**
 * Export audit logs as a styled workbook definition.
 */
export async function exportAuditLogsAction(
	filters: AuditFilters,
): Promise<StyledXlsxInput> {
	try {
		const logs = await getAuditLogs(filters);
		return {
			sheetName: "Audit Logs",
			title: "Audit Log Export",
			subtitle: `CAALM · ${logs.length} event${logs.length === 1 ? "" : "s"} · Generated ${new Date().toISOString().slice(0, 10)}`,
			columns: [
				{ header: "Timestamp", width: 20 },
				{ header: "Event ID", width: 28 },
				{ header: "Event Title", width: 40 },
				{ header: "Action", width: 16 },
				{ header: "Source", width: 16 },
				{ header: "User ID", width: 26 },
				{ header: "User Name", width: 24 },
				{ header: "User Email", width: 30 },
				{ header: "IP Address", width: 16 },
				{ header: "User Agent", width: 36 },
				{ header: "Reason", width: 30 },
				{ header: "Status", type: "status", width: 14 },
				{ header: "Error Message", width: 36 },
				{ header: "Metadata", width: 40 },
			],
			rows: logs.map((log) => [
				(log.created_at || "").replace("T", " ").slice(0, 19),
				log.event_id,
				log.event_title,
				log.action,
				log.source,
				log.user_id,
				log.user_name,
				log.user_email,
				log.ip_address,
				log.user_agent,
				log.reason,
				log.status,
				log.error_message,
				log.metadata ? JSON.stringify(log.metadata) : "",
			]),
			isPositiveStatus: (v) => v === "success",
		};
	} catch (error) {
		console.error("Error in exportAuditLogsAction:", error);
		throw error;
	}
}
