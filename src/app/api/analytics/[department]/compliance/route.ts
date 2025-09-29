import { NextRequest } from 'next/server';
import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

function mapRouteToDbDepartment(routeDept: string): string {
  const mapping: Record<string, string> = {
    'child-welfare': 'child-welfare',
    'behavioral-health': 'behavioral-health',
    cfs: 'cfs',
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

    const docs = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractsCollectionId,
      queries: [Query.equal('department', dbDept), Query.limit(200)],
    });

    const buckets: Record<string, number> = {
      'up-to-date': 0,
      'action-required': 0,
      'non-compliant': 0,
      unknown: 0,
    };

    for (const d of docs.rows as any[]) {
      const key = d.compliance ?? 'unknown';
      if (buckets[key] === undefined) buckets.unknown += 1;
      else buckets[key] += 1;
    }

    const data = Object.entries(buckets).map(([status, count]) => ({
      status,
      count,
    }));

    return Response.json({ data });
  } catch (error: any) {
    console.error('analytics/compliance error', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to load compliance' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
