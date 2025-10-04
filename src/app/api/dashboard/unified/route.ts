import { NextRequest } from 'next/server';
import { createApiAdminClient } from '@/lib/appwrite/api-client';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import { getUninvitedUsers } from '@/lib/actions/user.actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || 'default_organization';
    const userId = searchParams.get('userId');

    console.log('Unified dashboard API called with:', { orgId, userId });

    if (!userId) {
      console.error('Unified dashboard API: Missing userId parameter');
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { tablesDB } = await createApiAdminClient();

    // Fetch all data simultaneously using Promise.allSettled for error handling
    const [
      contractsResult,
      usersResult,
      invitationsResult,
      filesResult,
      reportsResult,
      departmentsResult,
      reportTemplatesResult,
      notificationsResult,
      notificationsStatsResult,
      recentActivitiesResult,
      calendarEventsResult,
      uninvitedUsersResult,
    ] = await Promise.allSettled([
      // Contracts data
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.contractsCollectionId || 'contracts',
        queries: [Query.limit(1000)],
      }),

      // Users data
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.usersCollectionId || 'users',
        queries: [Query.limit(1000)],
      }),

      // Invitations data
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.invitationsCollectionId || 'invitations',
        queries: [Query.equal('orgId', orgId), Query.limit(100)],
      }),

      // Files data
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.filesCollectionId || 'files',
        queries: [Query.orderDesc('$createdAt'), Query.limit(10)],
      }),

      // Reports data
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.reportsCollectionId || 'reports',
        queries: [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(20),
        ],
      }),

      // Departments data (static)
      Promise.resolve({ documents: [] }), // Placeholder for departments

      // Report templates data (static)
      Promise.resolve({ documents: [] }), // Placeholder for report templates

      // Notifications data
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries: [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ],
      }),

      // Notifications stats
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.notificationsCollectionId || 'notifications',
        queries: [Query.equal('userId', userId)],
      }),

      // Recent activities
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.recentActivityCollectionId || 'recent-activity',
        queries: [Query.orderDesc('$createdAt'), Query.limit(15)],
      }),

      // Calendar events
      tablesDB.listRows({
        databaseId: appwriteConfig.databaseId || 'default-db',
        tableId: appwriteConfig.calendarEventsCollectionId || 'calendar-events',
        queries: [Query.orderDesc('$createdAt'), Query.limit(50)],
      }),

      // Uninvited users from Auth database
      getUninvitedUsers(),
    ]);

    // Helper function to safely get results
    const getResult = (result: any) => {
      if (result.status === 'fulfilled') {
        return {
          ...result.value,
          documents: result.value.rows || result.value.documents || [],
        };
      }
      console.error('Database query failed:', result.reason);
      return { documents: [], total: 0 };
    };

    // Extract results safely
    const contracts = getResult(contractsResult);
    const users = getResult(usersResult);
    const invitations = getResult(invitationsResult);
    const files = getResult(filesResult);
    const reports = getResult(reportsResult);
    const notifications = getResult(notificationsResult);
    const notificationsStats = getResult(notificationsStatsResult);
    const recentActivities = getResult(recentActivitiesResult);
    const calendarEvents = getResult(calendarEventsResult);

    // Calculate dashboard stats
    const totalContracts = contracts.total;
    const expiringContracts = contracts.documents.filter((contract: any) => {
      const expiryDate = new Date(contract.expiryDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
    }).length;

    const activeUsers = users.documents.filter(
      (user: any) => user.status === 'active'
    ).length;

    const compliantContracts = contracts.documents.filter(
      (contract: any) =>
        contract.compliance === 'up-to-date' ||
        contract.compliance === 'compliant'
    ).length;
    const complianceRate =
      totalContracts > 0
        ? Math.round((compliantContracts / totalContracts) * 100)
        : 0;

    // Calculate notifications stats
    const unreadNotifications = notificationsStats.documents.filter(
      (notification: any) => !notification.read
    ).length;
    const totalNotifications = notificationsStats.total;

    // Get uninvited users result
    const uninvitedUsers =
      uninvitedUsersResult.status === 'fulfilled'
        ? uninvitedUsersResult.value
        : [];

    const unifiedData = {
      stats: {
        totalContracts,
        expiringContracts,
        activeUsers,
        complianceRate: `${complianceRate}%`,
      },
      files: files.documents,
      invitations: invitations.documents,
      authUsers: users.documents,
      uninvitedUsers: uninvitedUsers,
      reports: reports.documents,
      departments: getResult(departmentsResult).documents,
      reportTemplates: getResult(reportTemplatesResult).documents,
      notifications: notifications.documents,
      notificationsStats: {
        unread: unreadNotifications,
        total: totalNotifications,
      },
      recentActivities: recentActivities.documents,
      calendarEvents: calendarEvents.documents,
    };

    return new Response(
      JSON.stringify({
        data: unifiedData,
        timestamp: Date.now(),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error fetching unified dashboard data:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: (error as Error)?.message || 'Failed to load dashboard data',
        timestamp: new Date().toISOString(),
        debug:
          process.env.NODE_ENV === 'development'
            ? {
                stack: error instanceof Error ? error.stack : undefined,
              }
            : undefined,
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
