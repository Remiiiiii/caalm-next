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

    // Contracts by department
    const contracts = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractsCollectionId,
      queries: [Query.equal('department', dbDept), Query.limit(200)],
    });

    const totalContracts = contracts.total;
    const compliantCount = contracts.rows.filter(
      (d: any) => d.compliance === 'up-to-date'
    ).length;
    const budgetSum = contracts.rows.reduce((sum: number, d: any) => {
      const amount = typeof d.amount === 'number' ? d.amount : 0;
      return sum + amount;
    }, 0);

    // Staff count from users collection
    const users = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      queries: [Query.equal('department', dbDept), Query.limit(200)],
    });

    const data = {
      totalContracts,
      totalBudget: budgetSum,
      staffCount: users.total,
      complianceRate: totalContracts
        ? Math.round((compliantCount / totalContracts) * 100)
        : 0,
    };

    return Response.json({ data });
  } catch (error: any) {
    console.error('analytics/stats error', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to load stats' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
