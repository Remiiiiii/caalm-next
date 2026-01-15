import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import {
  successResponse,
  errorResponse,
  generateRequestId,
} from '@/lib/api/contracts/utils/response.util';
import { requireAuth } from '@/lib/api/contracts/middleware/auth.middleware';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    // Authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const { contractId, snoozedUntil } = body;

    if (!contractId || !snoozedUntil) {
      return errorResponse(
        new Error('Missing required fields: contractId, snoozedUntil'),
        400,
        { requestId }
      );
    }

    const { tablesDB } = await createAdminClient();

    // Update contract's snoozedUntil field
    const updatedContract = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId!,
      tableId: appwriteConfig.contractsCollectionId!,
      rowId: contractId,
      data: {
        snoozedUntil: snoozedUntil,
      },
    });

    return successResponse(updatedContract, { requestId });
  } catch (error) {
    console.error('Error updating contract snooze:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to update contract snooze'),
      500,
      { requestId }
    );
  }
}
