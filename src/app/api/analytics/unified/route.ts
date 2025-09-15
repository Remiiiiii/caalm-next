import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import {
  DIVISION_TO_DEPARTMENT,
  CONTRACT_DEPARTMENTS,
} from '../../../../../constants';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const { databases } = await createAdminClient();

    // Fetch all analytics data simultaneously using Promise.all
    const [
      contractsResult,
      usersResult,
      reportsResult,
      departmentsResult,
      reportTemplatesResult,
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
    ]);

    // Group contracts by department and division
    const contractsByDepartment: Record<string, unknown[]> = {};
    const contractsByDivision: Record<string, unknown[]> = {};

    contractsResult.documents.forEach((contract: unknown) => {
      const contractData = contract as Record<string, unknown>;
      const department = contractData.department as string;
      const division = contractData.division as string;

      // Group by department (for departments without divisions)
      if (department) {
        if (!contractsByDepartment[department]) {
          contractsByDepartment[department] = [];
        }
        contractsByDepartment[department].push(contract);
      }

      // Group by division (for departments with divisions)
      if (division) {
        if (!contractsByDivision[division]) {
          contractsByDivision[division] = [];
        }
        contractsByDivision[division].push(contract);
      }
    });

    // Group users by division
    const usersByDivision: Record<string, unknown[]> = {};
    usersResult.documents.forEach((user: unknown) => {
      const userData = user as Record<string, unknown>;
      const division = userData.division as string;
      if (division) {
        if (!usersByDivision[division]) {
          usersByDivision[division] = [];
        }
        usersByDivision[division].push(user);
      }
    });

    // Calculate stats for a given contracts array
    const calculateStats = (contracts: unknown[]) => {
      const totalContracts = contracts.length;
      const compliantCount = contracts.filter((c) => {
        const contractData = c as Record<string, unknown>;
        return (
          contractData.compliance === 'up-to-date' ||
          contractData.compliance === 'compliant'
        );
      }).length;
      const totalBudget = contracts.reduce((sum: number, c) => {
        const contractData = c as Record<string, unknown>;
        const amount =
          typeof contractData.amount === 'number' ? contractData.amount : 0;
        return sum + amount;
      }, 0);

      const complianceRate = totalContracts
        ? Math.round((compliantCount / totalContracts) * 100)
        : 0;

      return {
        totalContracts,
        totalBudget,
        staffCount: 0, // Will be updated later
        complianceRate,
      };
    };

    // Initialize all departments from CONTRACT_DEPARTMENTS
    const departmentGroups: Record<
      string,
      { divisions: unknown[]; contracts: unknown[]; users: unknown[] }
    > = {};

    // Initialize all departments with empty data
    CONTRACT_DEPARTMENTS.forEach((departmentName) => {
      departmentGroups[departmentName] = {
        divisions: [],
        contracts: [],
        users: [],
      };
    });

    // Group divisions by department and populate data
    Object.keys(DIVISION_TO_DEPARTMENT).forEach((divisionId) => {
      const departmentName =
        DIVISION_TO_DEPARTMENT[
          divisionId as keyof typeof DIVISION_TO_DEPARTMENT
        ];

      // Only add divisions to departments that have them
      if (departmentGroups[departmentName]) {
        departmentGroups[departmentName].divisions.push({
          id: divisionId,
          name: divisionId
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          description: `${divisionId} division for the ${departmentName} department`,
          stats: calculateStats(contractsByDivision[divisionId] || []),
        });

        departmentGroups[departmentName].contracts.push(
          ...(contractsByDivision[divisionId] || [])
        );
        departmentGroups[departmentName].users.push(
          ...(usersByDivision[divisionId] || [])
        );
      }
    });

    // Create departments data - all departments will be included
    const departmentsData = CONTRACT_DEPARTMENTS.map((departmentName) => {
      const group = departmentGroups[departmentName];

      // Add contracts directly assigned to this department (not through divisions)
      const directContracts = contractsByDepartment[departmentName] || [];
      const allContracts = [...group.contracts, ...directContracts];

      const totalStats = calculateStats(allContracts);
      totalStats.staffCount = group.users.length;

      return {
        name: departmentName,
        divisions: group.divisions, // Will be empty for departments without divisions
        totalStats,
      };
    });

    // Calculate overall totals
    const totalContracts = contractsResult.total;
    const totalBudget = contractsResult.documents.reduce((sum: number, c) => {
      const contractData = c as Record<string, unknown>;
      const amount =
        typeof contractData.amount === 'number' ? contractData.amount : 0;
      return sum + amount;
    }, 0);
    const totalStaff = usersResult.total;
    const totalCompliant = contractsResult.documents.filter((c) => {
      const contractData = c as Record<string, unknown>;
      return (
        contractData.compliance === 'up-to-date' ||
        contractData.compliance === 'compliant'
      );
    }).length;
    const overallComplianceRate = totalContracts
      ? Math.round((totalCompliant / totalContracts) * 100)
      : 0;

    const hasContracts = totalContracts > 0;

    const unifiedData = {
      departments: departmentsData,
      totals: {
        totalContracts,
        totalBudget,
        totalStaff,
        overallComplianceRate,
      },
      hasContracts,
      reports: reportsResult.documents,
      departmentsList: departmentsResult.documents,
      reportTemplates: reportTemplatesResult.documents,
    };

    return new Response(
      JSON.stringify({
        data: unifiedData,
        timestamp: Date.now(),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error fetching unified analytics data:', error);
    return new Response(
      JSON.stringify({
        error: (error as Error)?.message || 'Failed to load analytics data',
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
