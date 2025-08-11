'use server';

import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const getContractDepartmentEnums = async () => {
  const { databases } = await createAdminClient();
  try {
    const attr = (await databases.getAttribute(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      'department'
    )) as { elements?: string[] };
    return attr.elements || [];
  } catch (error) {
    handleError(error, 'Failed to fetch contract department enums');
  }
};

export const getUserDepartmentEnums = async () => {
  const { databases } = await createAdminClient();
  try {
    const attr = (await databases.getAttribute(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      'department'
    )) as { elements?: string[] };
    return attr.elements || [];
  } catch (error) {
    handleError(error, 'Failed to fetch user department enums');
  }
};

export const getUsersByDepartment = async (department: string) => {
  const { databases } = await createAdminClient();
  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('department', department), Query.equal('role', 'manager')]
    );
    return users.documents;
  } catch (error) {
    handleError(error, 'Failed to fetch users by department');
  }
};

export const getAllManagers = async () => {
  const { databases } = await createAdminClient();
  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      [Query.equal('role', 'manager')]
    );
    return users.documents;
  } catch (error) {
    handleError(error, 'Failed to fetch all managers');
  }
};
