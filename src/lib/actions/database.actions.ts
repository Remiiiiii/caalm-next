'use server';

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const getContractDepartmentEnums = async () => {
  const { tablesDB } = await createAdminClient();
  try {
    const attr = (await tablesDB.getColumn({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractsCollectionId,
      key: 'department',
    })) as { elements?: string[] };
    return attr.elements || [];
  } catch (error) {
    handleError(error, 'Failed to fetch contract department enums');
  }
};

export const getUserDivisionEnums = async () => {
  const { tablesDB } = await createAdminClient();
  try {
    const attr = (await tablesDB.getColumn({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      key: 'division',
    })) as { elements?: string[] };
    return attr.elements || [];
  } catch (error) {
    handleError(error, 'Failed to fetch user division enums');
  }
};

export const getUsersByDivision = async (division: string) => {
  const { tablesDB } = await createAdminClient();
  try {
    const users = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      queries: [
        Query.equal('division', division),
        Query.equal('role', 'manager'),
      ],
    });
    return users.rows;
  } catch (error) {
    handleError(error, 'Failed to fetch users by division');
  }
};

export const getUsersByDepartment = async (department: string) => {
  const { tablesDB } = await createAdminClient();
  try {
    // Import the division mapping
    const { DIVISION_TO_DEPARTMENT } = await import('../../../constants');

    // Find all divisions that belong to this department
    const divisions = Object.entries(DIVISION_TO_DEPARTMENT)
      .filter(([, dept]) => dept === department)
      .map(([division]) => division);

    if (divisions.length === 0) {
      return [];
    }

    // Query users by division(s) that belong to this department
    const users = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      queries: [
        Query.equal('division', divisions),
        Query.equal('role', 'manager'),
      ],
    });
    return users.rows;
  } catch (error) {
    handleError(error, 'Failed to fetch users by department');
  }
};

export const getAllManagers = async () => {
  const { tablesDB } = await createAdminClient();
  try {
    const users = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.usersCollectionId,
      queries: [Query.equal('role', 'manager')],
    });
    return users.rows;
  } catch (error) {
    handleError(error, 'Failed to fetch all managers');
  }
};
