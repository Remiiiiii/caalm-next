import { NextRequest } from 'next/server';
import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

function mapRouteToDbDepartment(routeDept: string): string {
  const mapping: Record<string, string> = {
    'child-welfare': 'childwelfare',
    'behavioral-health': 'behavioralhealth',
    cfs: 'cins-fins-snap',
    residential: 'residential',
    clinic: 'clinic',
    administration: 'administration',
  };
  return mapping[routeDept] || routeDept;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ department: string }> }
) {
  try {
    const resolvedParams = await params;
    const dbDept = mapRouteToDbDepartment(resolvedParams.department);
    const { tablesDB } = await createAdminClient();

    // Get all recent activities and filter by department on the client side
    // This avoids the schema error since not all activities may have a department field
    const activities = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.recentActivityCollectionId,
      queries: [Query.limit(200)],
    });

    // Filter activities by department on the client side
    const departmentActivities = activities.rows.filter(
      (activity: any) =>
        activity.department === dbDept ||
        activity.department === resolvedParams.department ||
        // Also include activities that might be related to contracts in this department
        (activity.type === 'contract' && activity.contractName)
    );

    const byWeek: Record<string, number> = {};
    for (const a of departmentActivities) {
      const ts = a.timestamp || a.$createdAt;
      const date = new Date(ts);
      const year = date.getUTCFullYear();
      const week = Math.ceil(
        ((date.getTime() - Date.UTC(year, 0, 1)) / 86400000 +
          new Date(Date.UTC(year, 0, 1)).getUTCDay() +
          1) /
          7
      );
      const key = `${year}-W${week}`;
      byWeek[key] = (byWeek[key] || 0) + 1;
    }

    const data = Object.entries(byWeek)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([week, count]) => ({ week, count }));

    return Response.json({ data });
  } catch (error: any) {
    console.error('analytics/performance error', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to load performance' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
