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

    const documents = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      [Query.equal('department', dbDept), Query.limit(200)]
    );

    const data = documents.documents.map((d: any) => ({
      id: d.$id,
      name: d.contractName,
      amount: d.amount ?? 0,
      status: d.status,
      compliance: d.compliance,
      expiryDate: d.contractExpiryDate,
    }));

    return Response.json({ data });
  } catch (error: any) {
    console.error('analytics/contracts error', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to load contracts' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
