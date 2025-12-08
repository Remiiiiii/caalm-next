import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');
    const ownerId = searchParams.get('ownerId');

    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

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

    return NextResponse.json({
      success: true,
      draftId,
      contractId,
      hasRelationship: !!contractId,
    });
  } catch (error: any) {
    console.error('Error getting contract ID from draft:', error);
    return NextResponse.json(
      {
        error: 'Failed to get contract ID',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
