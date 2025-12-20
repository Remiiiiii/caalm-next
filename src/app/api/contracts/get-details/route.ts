import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { constructFileUrl } from '@/lib/utils';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationErrorResponse,
  generateRequestId,
} from '@/lib/api/contracts/utils/response.util';
import { requireAuth } from '@/lib/api/contracts/middleware/auth.middleware';
import { parseAndValidateQuery } from '@/lib/api/contracts/middleware/validation.middleware';
import { contractQuerySchema } from '@/lib/api/contracts/schemas/contract.schema';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');

    if (!contractId) {
      return validationErrorResponse('Contract ID is required', requestId);
    }

    const { tablesDB } = await createAdminClient();

    // Fetch contract from database
    const contract = await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId || 'default-db',
      tableId: appwriteConfig.contractsCollectionId || 'contracts',
      rowId: contractId,
    });

    if (!contract) {
      return notFoundResponse('Contract', requestId);
    }

    let fileUrl = '';
    let fileExtension = 'pdf';

    // If contract has fileId, fetch file details
    if (contract.fileId) {
      try {
        const fileDoc = await tablesDB.getRow({
          databaseId: appwriteConfig.databaseId || 'default-db',
          tableId: appwriteConfig.filesCollectionId || 'files',
          rowId: contract.fileId,
          queries: [],
        });

        if (fileDoc && fileDoc.url) {
          fileUrl = fileDoc.url;
        }
        if (fileDoc && fileDoc.extension) {
          fileExtension = fileDoc.extension;
        }
      } catch (fileError) {
        console.warn('Failed to fetch file details:', fileError);
        // Try to construct file URL from storage if fileId is a storage file ID
        try {
          fileUrl = constructFileUrl(contract.fileId);
        } catch (storageError) {
          console.warn('Failed to construct file URL:', storageError);
        }
      }
    }

    return successResponse(
      {
        contractId: contract.$id,
        contractName: contract.contractName || 'Unnamed Contract',
        description: contract.description || '',
        contractType: contract.contractType || '',
        vendor: contract.vendor || '',
        amount: contract.amount || '',
        contractNumber: contract.contractNumber || '',
        contractExpiryDate: contract.contractExpiryDate || '',
        status: contract.status || '',
        fileId: contract.fileId || '',
        fileUrl: fileUrl,
        fileExtension: fileExtension,
      },
      { requestId }
    );
  } catch (error) {
    console.error('Error fetching contract details:', error);
    return errorResponse(
          error instanceof Error
        ? error
        : new Error('Failed to fetch contract details'),
      500,
      { requestId }
    );
  }
}
