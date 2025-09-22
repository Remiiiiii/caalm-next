import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';
import { CONTRACT_DEPARTMENTS } from '@/constants';

interface ContractStats {
  totalContracts: number;
  totalBudget: number;
  activeContracts: number;
  expiredContracts: number;
  pendingContracts: number;
  complianceRate: number;
  staffCount: number;
}

interface DepartmentAnalytics {
  name: string;
  divisions: {
    id: string;
    name: string;
    description: string;
    stats: ContractStats;
  }[];
  totalStats: ContractStats;
}

export async function GET(request: NextRequest) {
  try {
    const { tablesDB } = await createAdminClient();

    // Get all contracts from the database
    const allContracts = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractsCollectionId,
      queries: [Query.limit(2000)], // Increased limit for comprehensive data
    });

    // Get all users to calculate staff counts
    const allUsers = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      queries: [Query.limit(2000), Query.equal('status', 'active')], // Only active users
    });

    // Group contracts by department and division
    const contractsByDepartment: Record<string, any[]> = {};
    const contractsByDivision: Record<string, any[]> = {};

    allContracts.rows.forEach((contract: any) => {
      const department = contract.department as string;
      const division = contract.division as string;

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
    const usersByDivision: Record<string, any[]> = {};
    allUsers.rows.forEach((user: any) => {
      const division = user.division as string;
      if (division) {
        if (!usersByDivision[division]) {
          usersByDivision[division] = [];
        }
        usersByDivision[division].push(user);
      }
    });

    // Calculate stats for a given contracts array
    const calculateStats = (contracts: any[]): ContractStats => {
      const totalContracts = contracts.length;
      const totalBudget = contracts.reduce((sum, contract) => {
        const amount =
          typeof contract.amount === 'number' ? contract.amount : 0;
        return sum + amount;
      }, 0);

      const activeContracts = contracts.filter(
        (c) => c.status === 'active' || c.status === 'Active'
      ).length;
      const expiredContracts = contracts.filter(
        (c) => c.status === 'expired' || c.status === 'Expired'
      ).length;
      const pendingContracts = contracts.filter(
        (c) => c.status === 'pending' || c.status === 'Pending'
      ).length;

      const compliantContracts = contracts.filter(
        (c) => c.compliance === 'compliant' || c.compliance === 'up-to-date'
      ).length;
      const complianceRate =
        totalContracts > 0
          ? Math.round((compliantContracts / totalContracts) * 100)
          : 0;

      return {
        totalContracts,
        totalBudget,
        activeContracts,
        expiredContracts,
        pendingContracts,
        complianceRate,
        staffCount: 0, // Will be set separately
      };
    };

    // Department configuration with divisions
    const departmentConfig: Record<
      string,
      {
        name: string;
        divisions: { id: string; name: string; description: string }[];
      }
    > = {
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
        divisions: [
          {
            id: 'accounting',
            name: 'Accounting',
            description: 'Financial accounting and reporting',
          },
        ],
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
        divisions: [
          {
            id: 'c-suite',
            name: 'C-Suite',
            description: 'Executive leadership and management',
          },
        ],
      },
      Engineering: {
        name: 'Engineering',
        divisions: [],
      },
    };

    // Process each department
    const departmentsData: DepartmentAnalytics[] = [];

    Object.entries(departmentConfig).forEach(([deptKey, deptConfig]) => {
      const departmentContracts = contractsByDepartment[deptKey] || [];
      const departmentStats = calculateStats(departmentContracts);

      // Map division IDs to database division names
      const dbDivisionMap: Record<string, string> = {
        'child-welfare': 'childwelfare',
        'behavioral-health': 'behavioralhealth',
        cfs: 'cins-fins-snap',
        residential: 'residential',
        clinic: 'clinic',
        support: 'support',
        'help-desk': 'help-desk',
        HR: 'HR',
        'c-suite': 'c-suite',
        accounting: 'accounting',
      };

      // Calculate department staff count from all its divisions
      let departmentStaffCount = 0;
      const divisions = deptConfig.divisions.map((division) => {
        const dbDivision = dbDivisionMap[division.id] || division.id;
        const divisionContracts = contractsByDivision[dbDivision] || [];
        const divisionStats = calculateStats(divisionContracts);
        const divisionStaffCount = usersByDivision[dbDivision]?.length || 0;
        divisionStats.staffCount = divisionStaffCount;
        departmentStaffCount += divisionStaffCount;

        return {
          id: division.id,
          name: division.name,
          description: division.description,
          stats: divisionStats,
        };
      });

      departmentStats.staffCount = departmentStaffCount;

      departmentsData.push({
        name: deptConfig.name,
        divisions,
        totalStats: departmentStats,
      });
    });

    // Calculate overall totals across all departments
    const totalContracts = allContracts.total;
    const totalBudget = allContracts.rows.reduce(
      (sum: number, contract: any) => {
        const amount =
          typeof contract.amount === 'number' ? contract.amount : 0;
        return sum + amount;
      },
      0
    );
    const totalActiveStaff = allUsers.total;

    const totalStats = {
      totalContracts,
      totalBudget,
      totalActiveStaff,
      complianceRate: calculateStats(allContracts.rows).complianceRate,
    };

    return Response.json({
      success: true,
      data: {
        departments: departmentsData,
        totalStats,
      },
    });
  } catch (error: any) {
    console.error('Admin analytics error:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    return Response.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch admin analytics',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
