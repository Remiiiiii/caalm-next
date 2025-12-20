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
    // Parse pagination parameters
    const { limit, offset } = parsePaginationParams(request);

    const { tablesDB } = await createAdminClient();

    // Fetch contracts from database with pagination
    const contracts = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.contractsCollectionId || 'contracts',
      queries: [
        Query.select(['$id', 'contractName', 'contractType', 'vendor']),
        Query.limit(limit),
        Query.offset(offset),
      ],
    });

    // Map contracts to simple format for dropdown
    const contractList = contracts.rows.map((contract: any) => ({
      id: contract.$id,
      name: contract.contractName || 'Unnamed Contract',
      type: contract.contractType,
      vendor: contract.vendor,
    }));

    const paginationMeta = buildPaginationMeta(limit, offset, contracts.total);

    return successResponse(
      { contracts: contractList },
      {
        requestId,
        pagination: paginationMeta,
      }
    );
  } catch (error) {
    console.error('Error fetching contracts from database:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to fetch contracts'),
      500,
      { requestId }
    );
  }
}
