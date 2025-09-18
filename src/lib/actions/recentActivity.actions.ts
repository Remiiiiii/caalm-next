'use server';

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';

export interface RecentActivity {
  $id: string;
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  contractId?: string;
  contractName?: string;
  eventId?: string;
  eventTitle?: string;
  department?: string;
  timestamp: string;
  type: 'contract' | 'user' | 'event' | 'notification' | 'file';
  $createdAt: string;
  $updatedAt: string;
}

export interface CreateRecentActivityData {
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  contractId?: string;
  contractName?: string;
  eventId?: string;
  eventTitle?: string;
  department?: string;
  type: 'contract' | 'user' | 'event' | 'notification' | 'file';
}

/**
 * Get recent activities from the database
 */
export async function getRecentActivities(
  limit: number = 15
): Promise<RecentActivity[]> {
  try {
    if (!appwriteConfig.recentActivityCollectionId) {
      console.warn('Recent Activity collection ID not configured');
      return [];
    }

    const adminClient = await createAdminClient();
    const response = await adminClient.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.recentActivityCollectionId,
      queries: [Query.orderDesc('$createdAt'), Query.limit(limit)],
    });

    return response.rows as unknown as RecentActivity[];
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return [];
  }
}

/**
 * Create a new recent activity
 */
export async function createRecentActivity(
  data: CreateRecentActivityData
): Promise<RecentActivity | null> {
  try {
    if (!appwriteConfig.recentActivityCollectionId) {
      console.warn('Recent Activity collection ID not configured');
      return null;
    }

    const activityData = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    const adminClient = await createAdminClient();
    const response = await adminClient.tablesDB.createRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.recentActivityCollectionId,
      rowId: ID.unique(),
      data: activityData,
    });

    return response as unknown as RecentActivity;
  } catch (error) {
    console.error('Error creating recent activity:', error);
    return null;
  }
}

/**
 * Create activity for contract events
 */
export async function createContractActivity(
  action: string,
  contractName: string,
  contractId?: string,
  userId?: string,
  userName?: string
): Promise<RecentActivity | null> {
  return createRecentActivity({
    action,
    description: contractName,
    contractId,
    contractName,
    userId,
    userName,
    type: 'contract',
  });
}

/**
 * Create activity for user events
 */
export async function createUserActivity(
  action: string,
  userName: string,
  userId?: string,
  department?: string
): Promise<RecentActivity | null> {
  return createRecentActivity({
    action,
    description: userName,
    userId,
    userName,
    department,
    type: 'user',
  });
}

/**
 * Create activity for event events
 */
export async function createEventActivity(
  action: string,
  eventTitle: string,
  eventId?: string,
  userId?: string,
  userName?: string
): Promise<RecentActivity | null> {
  return createRecentActivity({
    action,
    description: eventTitle,
    eventId,
    eventTitle,
    userId,
    userName,
    type: 'event',
  });
}

/**
 * Create activity for file uploads
 */
export async function createFileActivity(
  action: string,
  fileName: string,
  userId?: string,
  userName?: string,
  department?: string
): Promise<RecentActivity | null> {
  return createRecentActivity({
    action,
    description: fileName,
    userId,
    userName,
    department,
    type: 'file',
  });
}

/**
 * Create activity for notifications
 */
export async function createNotificationActivity(
  action: string,
  description: string,
  userId?: string,
  userName?: string,
  department?: string
): Promise<RecentActivity | null> {
  return createRecentActivity({
    action,
    description,
    userId,
    userName,
    department,
    type: 'notification',
  });
}

/**
 * Delete old activities (keep only the last 100)
 */
export async function cleanupOldActivities(): Promise<void> {
  try {
    if (!appwriteConfig.recentActivityCollectionId) {
      return;
    }

    // Get all activities ordered by creation date
    const adminClient = await createAdminClient();
    const response = await adminClient.tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.recentActivityCollectionId,
      queries: [
        Query.orderDesc('$createdAt'),
        Query.limit(1000), // Get a large number to find old ones
      ],
    });

    const activities = response.rows as unknown as RecentActivity[];

    // Keep only the first 100 (most recent)
    if (activities.length > 100) {
      const activitiesToDelete = activities.slice(100);

      // Delete old activities
      for (const activity of activitiesToDelete) {
        try {
          const adminClient = await createAdminClient();
          await adminClient.tablesDB.deleteRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.recentActivityCollectionId,
            rowId: activity.$id,
          });
        } catch (error) {
          console.error(`Error deleting activity ${activity.$id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old activities:', error);
  }
}
