import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';
import {
  successResponse,
  errorResponse,
  generateRequestId,
} from '@/lib/api/contracts/utils/response.util';
import { requireAuth } from '@/lib/api/contracts/middleware/auth.middleware';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    // Authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { tablesDB } = await createAdminClient();

    // Fetch all contracts from the database with daysUntilExpiry
    const contractsResult = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId!,
      tableId: appwriteConfig.contractsCollectionId!,
      queries: [
        // Only fetch contracts that have an expiry date
        Query.isNotNull('contractExpiryDate'),
        // Order by expiry date ascending (soonest first)
        Query.orderAsc('contractExpiryDate'),
      ],
    });

    // Map contracts to include all necessary fields
    const contracts = contractsResult.rows.map((contract: any) => ({
      $id: contract.$id,
      contractName: contract.contractName || 'Unnamed Contract',
      name: contract.contractName || 'Unnamed Contract',
      contractExpiryDate: contract.contractExpiryDate,
      daysUntilExpiry: contract.daysUntilExpiry,
      status: contract.status,
      amount: contract.amount,
      compliance: contract.compliance,
      assignedManagers: contract.assignedManagers || [],
      fileId: contract.fileId,
      vendor: contract.vendor,
      contractNumber: contract.contractNumber,
      department: contract.department,
      contractType: contract.contractType,
    }));

    return successResponse(contracts, { requestId });
  } catch (error) {
    console.error('Error fetching all contracts:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to fetch contracts'),
      500,
      { requestId }
    );
  }
}
