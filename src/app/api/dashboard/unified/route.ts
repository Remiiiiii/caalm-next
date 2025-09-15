import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || 'default_organization';
    const userId = searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { databases } = await createAdminClient();

    // Fetch all data simultaneously using Promise.all
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
    ] = await Promise.all([
      // Contracts data
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.contractsCollectionId,
        [Query.limit(1000)]
      ),

      // Users data
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.limit(1000)]
      ),

      // Invitations data
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.invitationsCollectionId,
        [Query.equal('orgId', orgId), Query.limit(100)]
      ),

      // Files data
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        [Query.orderDesc('$createdAt'), Query.limit(10)]
      ),

      // Reports data
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.reportsCollectionId,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(20),
        ]
      ),

      // Departments data (static)
      Promise.resolve({ documents: [] }), // Placeholder for departments

      // Report templates data (static)
      Promise.resolve({ documents: [] }), // Placeholder for report templates

      // Notifications data
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(50),
        ]
      ),

      // Notifications stats
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.notificationsCollectionId,
        [Query.equal('userId', userId)]
      ),

      // Recent activities
      databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.activitiesCollectionId,
        [Query.orderDesc('$createdAt'), Query.limit(15)]
      ),

      // Calendar events
      databases.listDocuments(appwriteConfig.databaseId, 'calendar_events', [
        Query.orderDesc('$createdAt'),
        Query.limit(50),
      ]),
    ]);

    // Calculate dashboard stats
    const totalContracts = contractsResult.total;
    const expiringContracts = contractsResult.documents.filter(
      (contract: any) => {
        const expiryDate = new Date(contract.expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
      }
    ).length;

    const activeUsers = usersResult.documents.filter(
      (user: any) => user.status === 'active'
    ).length;

    const compliantContracts = contractsResult.documents.filter(
      (contract: any) =>
        contract.compliance === 'up-to-date' ||
        contract.compliance === 'compliant'
    ).length;
    const complianceRate =
      totalContracts > 0
        ? Math.round((compliantContracts / totalContracts) * 100)
        : 0;

    // Calculate notifications stats
    const unreadNotifications = notificationsStatsResult.documents.filter(
      (notification: any) => !notification.read
    ).length;
    const totalNotifications = notificationsStatsResult.total;

    const unifiedData = {
      stats: {
        totalContracts,
        expiringContracts,
        activeUsers,
        complianceRate: `${complianceRate}%`,
      },
      files: filesResult.documents,
      invitations: invitationsResult.documents,
      authUsers: usersResult.documents,
      reports: reportsResult.documents,
      departments: departmentsResult.documents,
      reportTemplates: reportTemplatesResult.documents,
      notifications: notificationsResult.documents,
      notificationsStats: {
        unread: unreadNotifications,
        total: totalNotifications,
      },
      recentActivities: recentActivitiesResult.documents,
      calendarEvents: calendarEventsResult.documents,
    };

    return new Response(
      JSON.stringify({
        data: unifiedData,
        timestamp: Date.now(),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error fetching unified dashboard data:', error);
    return new Response(
      JSON.stringify({
        error: (error as Error)?.message || 'Failed to load dashboard data',
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
