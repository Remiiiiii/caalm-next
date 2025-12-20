import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');
    const ownerId = searchParams.get('ownerId');

    if (!draftId) {
      return validationErrorResponse('Draft ID is required', requestId);
    }

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      return errorResponse(
        new Error('Database configuration missing'),
        500,
        { requestId }
      );
    }

    // Authentication
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { tablesDB } = await createAdminClient();

    // Get the draft to check the contractId relationship
    const draft = await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      rowId: draftId,
    });

    // Verify ownerId matches if provided
    if (ownerId && draft.ownerId !== ownerId) {
      return NextResponse.json(
        { error: 'Draft not found or access denied' },
        { status: 403 }
      );
    }

    // Extract contractId (stored as string attribute, not relationship)
    let contractId: string | null = null;
    if (draft.contractId) {
      contractId =
        typeof draft.contractId === 'string' ? draft.contractId : null;
    }

    return successResponse(
      {
        draftId: query.draftId,
        contractId,
        hasRelationship: !!contractId,
      },
      { requestId }
    );
  } catch (error: any) {
    console.error('Error getting contract ID from draft:', error);
    return errorResponse(
      error instanceof Error ? error : new Error('Failed to get contract ID'),
      500,
      { requestId }
    );
  }
}
