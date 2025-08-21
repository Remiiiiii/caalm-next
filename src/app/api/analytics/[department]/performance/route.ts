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
    const { databases } = await createAdminClient();

    // Use Recent Activities as a simple "performance" proxy: count actions per week
    const activities = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.recentActivityCollectionId,
      [Query.equal('department', dbDept), Query.limit(200)]
    );

    const byWeek: Record<string, number> = {};
    for (const a of activities.documents as any[]) {
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
