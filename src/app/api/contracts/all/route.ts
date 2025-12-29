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

    // Map contracts to include all necessary fields for UIFileDoc compatibility
    const contracts = contractsResult.rows.map((contract: any) => ({
      // Appwrite document fields
      $id: contract.$id,
      $createdAt: contract.$createdAt || new Date().toISOString(),
      $updatedAt: contract.$updatedAt || new Date().toISOString(),
      $permissions: contract.$permissions || [],
      $collectionId: contract.$collectionId || '',
      $databaseId: contract.$databaseId || '',
      $sequence: contract.$sequence || 0,
      
      // Core file properties
      type: 'contract',
      extension: 'pdf', // Default extension
      url: contract.url || '',
      name: contract.contractName || 'Unnamed Contract',
      size: contract.size || 0,
      owner: contract.contractOwnerId || contract.owner || '',
      users: contract.users || [],
      
      // Contract-specific fields
      contractId: contract.$id,
      contractName: contract.contractName || 'Unnamed Contract',
      contractOwnerId: contract.contractOwnerId,
      contractExpiryDate: contract.contractExpiryDate,
      status: contract.status,
      contractType: contract.contractType,
      amount: contract.amount,
      vendor: contract.vendor,
      contractNumber: contract.contractNumber,
      department: contract.department,
      assignedManagers: contract.assignedManagers || [],
      compliance: contract.compliance,
      priority: contract.priority,
      riskLevel: contract.riskLevel,
      description: contract.description,
      bucketFileId: contract.bucketFileId,
      fileId: contract.fileId,
      snoozedUntil: contract.snoozedUntil || null,
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
