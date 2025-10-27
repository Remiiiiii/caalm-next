import {
  getAuditLogs,
  getAuditStats,
  AuditFilters,
} from '@/lib/services/audit-logger';

/**
 * Get audit logs with filters
 */
export async function getAuditLogsAction(filters: AuditFilters) {
  try {
    return await getAuditLogs(filters);
  } catch (error) {
    console.error('Error in getAuditLogsAction:', error);
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
    console.error('Error in getAuditStatsAction:', error);
    throw error;
  }
}

/**
 * Export audit logs to CSV format
 */
export async function exportAuditLogsAction(
  filters: AuditFilters
): Promise<string> {
  try {
    const logs = await getAuditLogs(filters);

    // Create CSV header
    const headers = [
      'Timestamp',
      'Event ID',
      'Event Title',
      'Action',
      'Source',
      'User ID',
      'User Name',
      'User Email',
      'IP Address',
      'User Agent',
      'Reason',
      'Status',
      'Error Message',
      'Metadata',
    ];

    // Create CSV rows
    const rows = logs.map((log) => [
      log.created_at || '',
      log.event_id,
      log.event_title,
      log.action,
      log.source,
      log.user_id,
      log.user_name,
      log.user_email,
      log.ip_address || '',
      log.user_agent || '',
      log.reason || '',
      log.status,
      log.error_message || '',
      log.metadata ? JSON.stringify(log.metadata) : '',
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((field) => `"${field.toString().replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    return csvContent;
  } catch (error) {
    console.error('Error in exportAuditLogsAction:', error);
    throw error;
  }
}
