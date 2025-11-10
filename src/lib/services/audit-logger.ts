import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';

export interface AuditLogEntry {
  event_id: string;
  event_title: string;
  action: 'delete' | 'sync_delete' | 'restore' | 'approval_decided';
  source: 'caalm' | 'outlook';
  user_id: string;
  user_name: string;
  user_email: string;
  ip_address?: string;
  user_agent?: string;
  reason?: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface AuditFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  status?: string;
  eventId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    if (!appwriteConfig.databaseId || !appwriteConfig.auditLogsCollectionId) {
      console.error('Missing required Appwrite configuration for audit logs');
      return;
    }

    const adminClient = await createAdminClient();

    const auditData = {
      event_id: entry.event_id,
      event_title: entry.event_title,
      action: entry.action,
      source: entry.source,
      user_id: entry.user_id,
      user_name: entry.user_name,
      user_email: entry.user_email,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      reason: entry.reason || null,
      status: entry.status,
      error_message: entry.error_message || null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    };

    await adminClient.tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.auditLogsCollectionId,
      rowId: ID.unique(),
      data: auditData,
    });

    console.log(
      'Audit event logged successfully:',
      entry.action,
      entry.event_id
    );
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(
  filters?: AuditFilters
): Promise<AuditLogEntry[]> {
  try {
    if (!appwriteConfig.databaseId || !appwriteConfig.auditLogsCollectionId) {
      throw new Error('Missing required Appwrite configuration for audit logs');
    }

    const adminClient = await createAdminClient();
    const queries = [];

    // Add filters
    if (filters?.startDate) {
      queries.push(Query.greaterThanEqual('$createdAt', filters.startDate));
    }
    if (filters?.endDate) {
      queries.push(Query.lessThanEqual('$createdAt', filters.endDate));
    }
    if (filters?.userId) {
      queries.push(Query.equal('user_id', filters.userId));
    }
    if (filters?.action) {
      queries.push(Query.equal('action', filters.action));
    }
    if (filters?.status) {
      queries.push(Query.equal('status', filters.status));
    }
    if (filters?.eventId) {
      queries.push(Query.equal('event_id', filters.eventId));
    }

    // Add pagination
    if (filters?.limit) {
      queries.push(Query.limit(filters.limit));
    }
    if (filters?.offset) {
      queries.push(Query.offset(filters.offset));
    }

    // Order by creation date (newest first)
    queries.push(Query.orderDesc('$createdAt'));

    const response = await adminClient.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.auditLogsCollectionId,
      queries,
    });

    return response.rows.map((row: any) => ({
      event_id: row.event_id,
      event_title: row.event_title,
      action: row.action,
      source: row.source,
      user_id: row.user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      reason: row.reason,
      status: row.status,
      error_message: row.error_message,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      created_at: row.$createdAt,
    }));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStats(): Promise<{
  totalDeletions: number;
  successRate: number;
  failedSyncs: number;
  pendingSyncs: number;
  deletionsByUser: Array<{ user_name: string; count: number }>;
  deletionsByDate: Array<{ date: string; count: number }>;
}> {
  try {
    if (!appwriteConfig.databaseId || !appwriteConfig.auditLogsCollectionId) {
      throw new Error('Missing required Appwrite configuration for audit logs');
    }

    const adminClient = await createAdminClient();

    // Get all audit logs for statistics
    const response = await adminClient.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.auditLogsCollectionId,
      queries: [Query.orderDesc('$createdAt')],
    });

    const logs = response.rows;
    const totalDeletions = logs.filter(
      (log: any) => log.action === 'delete'
    ).length;
    const successfulDeletions = logs.filter(
      (log: any) => log.action === 'delete' && log.status === 'success'
    ).length;
    const failedSyncs = logs.filter(
      (log: any) => log.action === 'sync_delete' && log.status === 'failed'
    ).length;
    const pendingSyncs = logs.filter(
      (log: any) => log.action === 'sync_delete' && log.status === 'pending'
    ).length;

    // Group by user
    const userCounts: Record<string, number> = {};
    logs.forEach((log: any) => {
      if (log.action === 'delete') {
        userCounts[log.user_name] = (userCounts[log.user_name] || 0) + 1;
      }
    });

    const deletionsByUser = Object.entries(userCounts)
      .map(([user_name, count]) => ({ user_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 users

    // Group by date (last 30 days)
    const dateCounts: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    logs.forEach((log: any) => {
      if (
        log.action === 'delete' &&
        new Date(log.$createdAt) >= thirtyDaysAgo
      ) {
        const date = new Date(log.$createdAt).toISOString().split('T')[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    });

    const deletionsByDate = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalDeletions,
      successRate:
        totalDeletions > 0 ? (successfulDeletions / totalDeletions) * 100 : 0,
      failedSyncs,
      pendingSyncs,
      deletionsByUser,
      deletionsByDate,
    };
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    throw error;
  }
}
