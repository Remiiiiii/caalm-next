import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { ID, Query } from 'node-appwrite';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS, CACHE_TTLS } from '@/lib/services/cache-keys';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ownerId,
      accountId,
      formData,
      currentStep,
      processedFileData,
      extractedData,
    } = body;

    if (!ownerId || !accountId) {
      return NextResponse.json(
        { error: 'Owner ID and Account ID are required' },
        { status: 400 }
      );
    }

    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      console.error('Database configuration missing:', {
        databaseId: appwriteConfig.databaseId,
        collectionId: appwriteConfig.contractDraftsCollectionId,
      });
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const draftData = {
      ownerId,
      accountId,
      formData: JSON.stringify(formData),
      currentStep,
      processedFileData: processedFileData
        ? JSON.stringify(processedFileData)
        : null,
      extractedData: extractedData ? JSON.stringify(extractedData) : null,
      progressPercentage: Math.round((currentStep / 10) * 100),
      lastSavedAt: new Date().toISOString(),
      isCompleted: body.isCompleted || false,
    };

    console.log('Saving draft:', {
      databaseId: appwriteConfig.databaseId,
      collectionId: appwriteConfig.contractDraftsCollectionId,
      ownerId,
      accountId,
      currentStep,
      progressPercentage: draftData.progressPercentage,
      hasFormData: !!formData,
      hasProcessedFileData: !!processedFileData,
    });

    // Check if draftId is provided - if so, update existing draft
    // Otherwise, create a new draft (each file upload creates a new draft)
    const { draftId } = body;

    let draft;
    try {
      if (draftId) {
        // Update existing draft
        console.log('Updating existing draft:', draftId);
        draft = await tablesDB.updateRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          rowId: draftId,
          data: draftData,
        });
      } else {
        // Create new draft (every file upload creates a new draft)
        console.log('Creating new draft');
        draft = await tablesDB.createRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          rowId: ID.unique(),
          data: draftData,
        });
      }
      console.log('Draft saved successfully:', draft.$id);
    } catch (dbError: any) {
      console.error('Database error saving draft:', {
        error: dbError.message,
        code: dbError.code,
        type: dbError.type,
        response: dbError.response,
      });
      throw dbError;
    }

    // Invalidate cache for this owner's drafts to ensure fresh data
    try {
      await CacheManager.invalidate(CACHE_KEYS.contracts.drafts(ownerId));
    } catch (cacheError) {
      // Don't fail the request if cache invalidation fails
      console.warn('Failed to invalidate cache:', cacheError);
    }

    return NextResponse.json({
      success: true,
      draft,
      message: 'Draft saved successfully',
    });
  } catch (error: any) {
    console.error('Error saving draft:', {
      message: error?.message,
      code: error?.code,
      type: error?.type,
      response: error?.response,
      stack: error?.stack,
      name: error?.name,
      fullError: error,
    });

    // Extract error message from various possible error formats
    let errorMessage = 'Failed to save draft';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.response?.message) {
      errorMessage = error.response.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === 'development'
            ? {
                code: error?.code,
                type: error?.type,
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');

    if (!ownerId) {
      return NextResponse.json(
        { error: 'Owner ID is required' },
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

    // Use cache for lightning-fast response
    const cacheKey = CACHE_KEYS.contracts.drafts(ownerId);
    const databaseId = appwriteConfig.databaseId;
    const tableId = appwriteConfig.contractDraftsCollectionId;
    const cachedData = await CacheManager.withCache(
      'contracts/drafts',
      cacheKey,
      async () => {
        const { tablesDB } = await createAdminClient();

        // Optimize query - only select necessary fields for faster response
        const drafts = await tablesDB.listRows({
          databaseId,
          tableId,
          queries: [
            Query.equal('ownerId', ownerId),
            Query.equal('isCompleted', false),
            Query.orderDesc('lastSavedAt'),
            Query.limit(100),
            // Only select fields needed for the list view
            Query.select([
              '$id',
              'ownerId',
              'accountId',
              'formData',
              'currentStep',
              'progressPercentage',
              'lastSavedAt',
              'isCompleted',
              'processedFileData',
              'extractedData',
            ]),
          ],
        });

        // Filter out completed drafts and parse JSON fields
        const activeDrafts = drafts.rows
          .filter((draft: any) => !draft.isCompleted)
          .map((draft: any) => ({
            ...draft,
            formData: draft.formData ? JSON.parse(draft.formData) : null,
            processedFileData: draft.processedFileData
              ? JSON.parse(draft.processedFileData)
              : null,
            extractedData: draft.extractedData
              ? JSON.parse(draft.extractedData)
              : null,
          }));

        return activeDrafts;
      },
      CACHE_TTLS.medium
    );

    return NextResponse.json(
      {
        success: true,
        drafts: cachedData,
      },
      {
        headers: {
          'Cache-Control': `s-maxage=${CACHE_TTLS.medium}, stale-while-revalidate`,
          'X-Cache': 'HIT',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { tablesDB } = await createAdminClient();

    if (
      !appwriteConfig.databaseId ||
      !appwriteConfig.contractDraftsCollectionId
    ) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    // Get ownerId from draft if not provided in query params
    let draftOwnerId: string | null = ownerId;
    if (!draftOwnerId) {
      try {
        const draft = await tablesDB.getRow({
          databaseId: appwriteConfig.databaseId,
          tableId: appwriteConfig.contractDraftsCollectionId,
          rowId: draftId,
        });
        draftOwnerId = draft.ownerId as string;
      } catch (error) {
        // If we can't get the draft, proceed without cache invalidation
        console.warn('Could not fetch draft for cache invalidation:', error);
      }
    }

    await tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.contractDraftsCollectionId,
      rowId: draftId,
    });

    // Invalidate cache for this owner's drafts
    if (draftOwnerId) {
      try {
        await CacheManager.invalidate(
          CACHE_KEYS.contracts.drafts(draftOwnerId)
        );
      } catch (cacheError) {
        // Don't fail the request if cache invalidation fails
        console.warn('Failed to invalidate cache:', cacheError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete draft' },
      { status: 500 }
    );
  }
}
