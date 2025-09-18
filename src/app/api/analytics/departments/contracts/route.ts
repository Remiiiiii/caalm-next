// import { NextRequest } from 'next/server';
import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { DIVISION_TO_DEPARTMENT } from '../../../../../../constants';

interface ContractStats {
  totalContracts: number;
  totalBudget: number;
  staffCount: number;
  complianceRate: number;
}

interface DepartmentData {
  name: string;
  divisions: Array<{
    id: string;
    name: string;
    description: string;
    stats: ContractStats;
  }>;
  totalStats: ContractStats;
}

export async function GET() {
  try {
    const { tablesDB } = await createAdminClient();

    // Get all contracts from the database
    const allContracts = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractsCollectionId,
      queries: [Query.limit(1000)], // Get up to 1000 contracts
    });

    console.log(`Total contracts in database: ${allContracts.total}`);

    // Get all users to calculate staff counts
    const allUsers = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      queries: [Query.limit(1000)],
    });

    // Group contracts by department
    const contractsByDepartment: Record<string, unknown[]> = {};
    const contractsByDivision: Record<string, unknown[]> = {};

    allContracts.rows.forEach((contract: unknown) => {
      const contractData = contract as Record<string, unknown>;
      const department = contractData.department as string;
      const division = contractData.division as string;

      if (department) {
        if (!contractsByDepartment[department]) {
          contractsByDepartment[department] = [];
        }
        contractsByDepartment[department].push(contract);
      }

      if (division) {
        if (!contractsByDivision[division]) {
          contractsByDivision[division] = [];
        }
        contractsByDivision[division].push(contract);
      }
    });

    // Group users by division
    const usersByDivision: Record<string, unknown[]> = {};
    allUsers.rows.forEach((user: unknown) => {
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
    const calculateStats = (contracts: unknown[]): ContractStats => {
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
        staffCount: 0, // Will be set separately
        complianceRate,
      };
    };

    // Build department data structure
    const departmentData: DepartmentData[] = [];
    const departmentConfig = {
      IT: {
        name: 'IT',
        divisions: [
          {
            id: 'support',
            name: 'Support',
            description: 'Technical support and network services',
          },
          {
            id: 'help-desk',
            name: 'Help Desk',
            description: 'IT support and help desk services',
          },
        ],
      },
      Finance: {
        name: 'Finance',
        divisions: [],
      },
      Administration: {
        name: 'Administration',
        divisions: [
          {
            id: 'HR',
            name: 'Human Resources',
            description: 'Human resources administration',
          },
        ],
      },
      Legal: {
        name: 'Legal',
        divisions: [],
      },
      Operations: {
        name: 'Operations',
        divisions: [
          {
            id: 'child-welfare',
            name: 'Child Welfare',
            description: 'Child welfare services and program metrics',
          },
          {
            id: 'behavioral-health',
            name: 'Behavioral Health',
            description: 'Behavioral health services and outcomes',
          },
          {
            id: 'cfs',
            name: 'CFS',
            description: 'CFS program analytics and performance',
          },
          {
            id: 'residential',
            name: 'Residential',
            description: 'Residential services and facility metrics',
          },
          {
            id: 'clinic',
            name: 'Clinic',
            description: 'Clinical services and patient outcomes',
          },
        ],
      },
      Sales: {
        name: 'Sales',
        divisions: [],
      },
      Marketing: {
        name: 'Marketing',
        divisions: [],
      },
      Executive: {
        name: 'Executive',
        divisions: [],
      },
      Engineering: {
        name: 'Engineering',
        divisions: [],
      },
    };

    // Process each department
    Object.entries(departmentConfig).forEach(([deptKey, deptConfig]) => {
      const departmentContracts = contractsByDepartment[deptKey] || [];
      const departmentStats = calculateStats(departmentContracts);

      // Calculate staff count for the department
      const departmentDivisions = Object.entries(DIVISION_TO_DEPARTMENT)
        .filter(([, dept]) => dept === deptKey)
        .map(([division]) => division);

      const departmentStaffCount = departmentDivisions.reduce(
        (count, division) => {
          return count + (usersByDivision[division]?.length || 0);
        },
        0
      );

      departmentStats.staffCount = departmentStaffCount;

      const divisions = deptConfig.divisions.map((division) => {
        // Map division ID to database division name
        const dbDivisionMap: Record<string, string> = {
          'child-welfare': 'childwelfare',
          'behavioral-health': 'behavioralhealth',
          cfs: 'cins-fins-snap',
          residential: 'residential',
          clinic: 'clinic',
          administration: 'administration',
          support: 'support',
          'help-desk': 'help-desk',
        };

        const dbDivision = dbDivisionMap[division.id] || division.id;
        const divisionContracts = contractsByDivision[dbDivision] || [];
        const divisionStats = calculateStats(divisionContracts);
        divisionStats.staffCount = usersByDivision[dbDivision]?.length || 0;

        return {
          id: division.id,
          name: division.name,
          description: division.description,
          stats: divisionStats,
        };
      });

      departmentData.push({
        name: deptConfig.name,
        divisions,
        totalStats: departmentStats,
      });
    });

    // Calculate overall totals
    const totalContracts = allContracts.total;
    const totalBudget = allContracts.rows.reduce((sum: number, c) => {
      const contractData = c as Record<string, unknown>;
      const amount =
        typeof contractData.amount === 'number' ? contractData.amount : 0;
      return sum + amount;
    }, 0);
    const totalStaff = allUsers.total;
    const totalCompliant = allContracts.rows.filter((c) => {
      const contractData = c as Record<string, unknown>;
      return (
        contractData.compliance === 'up-to-date' ||
        contractData.compliance === 'compliant'
      );
    }).length;
    const overallComplianceRate = totalContracts
      ? Math.round((totalCompliant / totalContracts) * 100)
      : 0;

    const response = {
      departments: departmentData,
      totals: {
        totalContracts,
        totalBudget,
        totalStaff,
        overallComplianceRate,
      },
      hasContracts: totalContracts > 0,
    };

    console.log('Department analytics data:', {
      totalContracts,
      totalBudget,
      totalStaff,
      overallComplianceRate,
      departmentsWithContracts: departmentData.filter(
        (d) => d.totalStats.totalContracts > 0
      ).length,
    });

    return Response.json(response);
  } catch (error: unknown) {
    console.error('analytics/departments/contracts error', error);
    return new Response(
      JSON.stringify({
        error:
          (error as Error)?.message ||
          'Failed to load department contract data',
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
